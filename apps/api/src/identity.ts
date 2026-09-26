import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const db = new PrismaClient();

/**
 * JWT issuer, audience and JWKS URL are server-controlled configuration.
 * The selected tenant is only honored after database membership verification.
 */
@Injectable()
export class TenantIdentity {
  async requireTenant(authorization?: string, selectedTenant?: string): Promise<string> {
    const issuer = process.env.AUTH_JWT_ISSUER;
    const audience = process.env.AUTH_JWT_AUDIENCE;
    const jwksUrl = process.env.AUTH_JWKS_URL;
    if (!issuer || !audience || !jwksUrl) throw new UnauthorizedException('Authentication not configured');
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    let userId: string;
    try {
      const token = authorization.slice(7);
      const { payload } = await jwtVerify(token, createRemoteJWKSet(new URL(jwksUrl)), {
        issuer, audience, algorithms: ['RS256', 'ES256'],
      });
      if (!payload.sub) throw new Error('Missing subject');
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid authentication token');
    }
    const memberships = await db.tenantUser.findMany({
      where: { userId, ...(selectedTenant ? { tenantId: selectedTenant } : {}) },
      select: { tenantId: true },
      take: 2,
    });
    if (memberships.length === 0) throw new ForbiddenException('No tenant membership');
    if (!selectedTenant && memberships.length !== 1)
      throw new ForbiddenException('Select a tenant for this request');
    return memberships[0].tenantId;
  }
}
