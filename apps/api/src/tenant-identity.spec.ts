import { createHmac } from 'node:crypto';
import { verifyTenantAssertion } from './tenant-identity';

const secret = 'a-long-server-only-tenant-assertion-secret-for-tests';
const tenantId = '123e4567-e89b-42d3-a456-426614174000';
const now = 2000000000;

function token(claims: Record<string, unknown>) {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return 'Bearer ' + payload + '.' +
    createHmac('sha256', secret).update(payload).digest('hex');
}

describe('tenant assertion verification', () => {
  const valid = { tenantId, subject: 'employee-1', role: 'MANAGER', expiresAt: now + 60 };
  it('accepts valid signed claims', () => {
    expect(verifyTenantAssertion(token(valid), secret, now).tenantId).toBe(tenantId);
  });
  it('rejects tampered signatures', () => {
    const signed = token(valid);
    expect(() => verifyTenantAssertion(signed.slice(0, -1) + (signed.endsWith('0') ? '1' : '0'), secret, now)).toThrow();
  });
  it('rejects expired tokens', () => {
    expect(() => verifyTenantAssertion(token({ ...valid, expiresAt: now - 1 }), secret, now)).toThrow();
  });
  it('rejects invalid tenant IDs', () => {
    expect(() => verifyTenantAssertion(token({ ...valid, tenantId: 'another-tenant' }), secret, now)).toThrow();
  });
});
