import { ForbiddenException } from '@nestjs/common';
import { StoreAccessService } from './store-access.service';

const tenantId = '123e4567-e89b-42d3-a456-426614174000';
const identity = { tenantId, subject: 'employee-id', role: 'STAFF', expiresAt: 2000000000 };

function mockDb(overrides: { store?: unknown; employee?: unknown; assignment?: unknown; grant?: unknown } = {}) {
  return {
    store: { findFirst: jest.fn().mockResolvedValue(overrides.store === undefined ? { id: 'store-a' } : overrides.store) },
    employee: { findFirst: jest.fn().mockResolvedValue(overrides.employee === undefined ? { id: 'employee-id' } : overrides.employee) },
    employeeStoreAssignment: { findUnique: jest.fn().mockResolvedValue(overrides.assignment === undefined ? { storeId: 'store-a' } : overrides.assignment) },
    employeeStoreAccessGrant: { findFirst: jest.fn().mockResolvedValue(overrides.grant ?? null) },
  };
}

describe('StoreAccessService', () => {
  it('accepts an assigned store in the same tenant', async () => {
    const db = mockDb();
    await expect(new StoreAccessService(db as never).requireStore(identity, 'store-a')).resolves.toBeUndefined();
    expect(db.store.findFirst).toHaveBeenCalledWith({
      where: { id: 'store-a', tenantId }, select: { id: true },
    });
  });

  it('rejects stores belonging to another tenant', async () => {
    const db = mockDb({ store: null });
    await expect(new StoreAccessService(db as never).requireStore(identity, 'store-b')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an unassigned store without an active grant', async () => {
    const db = mockDb({ assignment: null, grant: null });
    await expect(new StoreAccessService(db as never).requireStore(identity, 'store-a')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a valid temporary grant', async () => {
    const db = mockDb({ assignment: null, grant: { id: 'grant-id' } });
    await expect(new StoreAccessService(db as never).requireStore(identity, 'store-a')).resolves.toBeUndefined();
  });
});
