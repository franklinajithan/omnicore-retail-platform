import { UnauthorizedException } from '@nestjs/common';
import { TenantMembershipService } from './tenant-membership.service';
import { createHmac } from 'node:crypto';

const secret = 'tenant-assertion-secret-long-enough-for-testing';
const tenantId = '123e4567-e89b-42d3-a456-426614174000';
const subject = 'employee-1';

function authorization(role: string) {
  const payload = Buffer.from(JSON.stringify({
    tenantId, subject, role, expiresAt: Math.floor(Date.now() / 1000) + 120,
  })).toString('base64url');
  return 'Bearer ' + payload + '.' + createHmac('sha256', secret).update(payload).digest('hex');
}

describe('TenantMembershipService', () => {
  const old = process.env.OMNICORE_TENANT_ASSERTION_SECRET;
  beforeEach(() => { process.env.OMNICORE_TENANT_ASSERTION_SECRET = secret; });
  afterEach(() => {
    if (old === undefined) delete process.env.OMNICORE_TENANT_ASSERTION_SECRET;
    else process.env.OMNICORE_TENANT_ASSERTION_SECRET = old;
  });

  it('accepts matching membership', async () => {
    const db = { tenantUser: { findUnique: jest.fn().mockResolvedValue({ role: 'MANAGER' }) } };
    const service = new TenantMembershipService(db as never);
    await expect(service.authenticate(authorization('MANAGER'))).resolves.toMatchObject({ tenantId, subject });
    expect(db.tenantUser.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId_userId: { tenantId, userId: subject } },
    }));
  });

  it('rejects a removed member', async () => {
    const db = { tenantUser: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new TenantMembershipService(db as never);
    await expect(service.authenticate(authorization('MANAGER'))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects stale role claims', async () => {
    const db = { tenantUser: { findUnique: jest.fn().mockResolvedValue({ role: 'CASHIER' }) } };
    const service = new TenantMembershipService(db as never);
    await expect(service.authenticate(authorization('MANAGER'))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
