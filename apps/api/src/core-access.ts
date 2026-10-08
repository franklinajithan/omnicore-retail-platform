import { createHmac, timingSafeEqual } from 'node:crypto';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type CoreRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER';
export interface CoreIdentity { userId: string; tenantId: string; role: CoreRole; storeId?: string; }

const roles: CoreRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'];
function decodeBase64Url(input: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) throw new UnauthorizedException('Invalid token encoding');
  return Buffer.from(input, 'base64url');
}

/** HS256 verification is deliberately fail-closed; no anonymous or header-derived identities. */
export function verifyCoreToken(authorization: string | undefined, secret: string | undefined): Omit<CoreIdentity, 'role'> {
  if (!secret || secret.length < 32) throw new UnauthorizedException('Core authentication is not configured');
  if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
  const token = authorization.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3) throw new UnauthorizedException('Invalid bearer token');
  const [header, payload, signature] = parts;
  let metadata: { alg?: string; typ?: string }, claims: Record<string, unknown>;
  try {
    metadata = JSON.parse(decodeBase64Url(header).toString('utf8'));
    claims = JSON.parse(decodeBase64Url(payload).toString('utf8'));
  } catch { throw new UnauthorizedException('Malformed token'); }
  if (metadata.alg !== 'HS256' || metadata.typ !== 'JWT') throw new UnauthorizedException('Unsupported token algorithm');
  const expected = createHmac('sha256', secret).update(header + '.' + payload).digest();
  const supplied = decodeBase64Url(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new UnauthorizedException('Invalid token signature');
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || !Number.isInteger(claims.exp) || claims.exp <= now || claims.exp > now + 86400 ||
      typeof claims.iat !== 'number' || !Number.isInteger(claims.iat) || claims.iat > now + 60 ||
      typeof claims.sub !== 'string' || !claims.sub.trim() ||
      typeof claims.tenantId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(claims.tenantId)) {
    throw new UnauthorizedException('Invalid or expired token claims');
  }
  if (claims.storeId !== undefined && (typeof claims.storeId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(claims.storeId))) throw new UnauthorizedException('Invalid store claim');
  return { userId: claims.sub, tenantId: claims.tenantId, ...(claims.storeId ? { storeId: claims.storeId } : {}) };
}

@Injectable()
export class CoreAccessService {
  constructor(private readonly db: PrismaService) {}

  async require(authorization: string | undefined, allowed: readonly CoreRole[], requestedTenantId?: string): Promise<CoreIdentity> {
    const claims = verifyCoreToken(authorization, process.env.OMNICORE_CORE_JWT_SECRET);
    if (requestedTenantId && requestedTenantId !== claims.tenantId) throw new ForbiddenException('Tenant access denied');
    const membership = await this.db.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId: claims.tenantId, userId: claims.userId } },
      select: { role: true }
    });
    if (!membership || !roles.includes(membership.role as CoreRole)) throw new ForbiddenException('No active tenant membership');
    const role = membership.role as CoreRole;
    if (!allowed.includes(role)) throw new ForbiddenException('Insufficient permissions');
    if (claims.storeId) {
      const store = await this.db.store.findFirst({ where: { id: claims.storeId, tenantId: claims.tenantId }, select: { id: true } });
      if (!store) throw new ForbiddenException('Invalid store scope');
    }
    return { ...claims, role };
  }
}
