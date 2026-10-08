import { createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

export interface PosDeviceScope { tenantId: string; storeId: string; deviceId: string; }
export function verifyDeviceCredential(auth: string | undefined, secret: string | undefined): PosDeviceScope {
  if (!secret || secret.length < 32 || !auth?.startsWith('Bearer ')) throw new UnauthorizedException('POS credentials required');
  const parts = auth.slice(7).split('.');
  if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) throw new UnauthorizedException('Invalid POS credential');
  const [payload, signature] = parts;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const supplied = Buffer.from(signature, 'base64url');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new UnauthorizedException('Invalid POS signature');
  let data: Record<string, unknown>;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
  catch { throw new UnauthorizedException('Invalid POS payload'); }
  const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
  const now = Math.floor(Date.now() / 1000);
  if (typeof data.tenantId !== 'string' || !uuid.test(data.tenantId) ||
      typeof data.storeId !== 'string' || !uuid.test(data.storeId) ||
      typeof data.deviceId !== 'string' || !uuid.test(data.deviceId) ||
      typeof data.exp !== 'number' || !Number.isInteger(data.exp) || data.exp <= now ||
      typeof data.iat !== 'number' || !Number.isInteger(data.iat) || data.iat > now + 60 ||
      data.exp - data.iat > 86400) throw new UnauthorizedException('Invalid POS scope or expiration');
  return { tenantId: data.tenantId, storeId: data.storeId, deviceId: data.deviceId };
}
