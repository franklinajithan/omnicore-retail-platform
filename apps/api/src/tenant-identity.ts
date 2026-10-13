import { createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

export type TenantIdentity = Readonly<{
  tenantId: string;
  subject: string;
  role: string;
  expiresAt: number;
}>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Verifies short-lived, server-issued HMAC identity assertions.
 * This is a building block, not a replacement for login, revocation,
 * membership checks, device attestation or database-level RLS.
 */
export function verifyTenantAssertion(
  authorization: string | undefined,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): TenantIdentity {
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Tenant assertion secret must be at least 32 bytes');
  }
  if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException();
  const token = authorization.slice(7);
  const parts = token.split('.');
  if (parts.length !== 2) throw new UnauthorizedException();
  const [payload, signature] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[a-f0-9]{64}$/.test(signature)) {
    throw new UnauthorizedException();
  }
  const expected = createHmac('sha256', secret).update(payload).digest();
  const supplied = Buffer.from(signature, 'hex');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new UnauthorizedException();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw new UnauthorizedException();
  }
  if (!parsed || typeof parsed !== 'object') throw new UnauthorizedException();
  const claims = parsed as Record<string, unknown>;
  if (
    typeof claims.tenantId !== 'string' || !uuidPattern.test(claims.tenantId) ||
    typeof claims.subject !== 'string' || claims.subject.length === 0 ||
    typeof claims.role !== 'string' || claims.role.length === 0 ||
    typeof claims.expiresAt !== 'number' || !Number.isSafeInteger(claims.expiresAt) ||
    claims.expiresAt <= now || claims.expiresAt > now + 3600
  ) throw new UnauthorizedException();
  return {
    tenantId: claims.tenantId,
    subject: claims.subject,
    role: claims.role,
    expiresAt: claims.expiresAt,
  };
}
