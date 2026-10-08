import { TenantRouter } from './tenant-router';

const tenantId = '123e4567-e89b-42d3-a456-426614174000';

describe('TenantRouter', () => {
  it('resolves an active shared tenant', async () => {
    const control = {
      tenantRegistry: {
        findUnique: jest.fn().mockResolvedValue({
          id: tenantId, databaseId: 'db1', status: 'ACTIVE',
          database: { databaseKey: 'shared-uk', mode: 'SHARED', region: 'uk', status: 'ACTIVE' },
        }),
        count: jest.fn(),
      },
    };
    await expect(new TenantRouter(control as never).resolve(tenantId)).resolves.toMatchObject({
      tenantId, databaseKey: 'shared-uk', mode: 'SHARED',
    });
    expect(control.tenantRegistry.count).not.toHaveBeenCalled();
  });

  it('rejects a suspended tenant', async () => {
    const control = { tenantRegistry: { findUnique: jest.fn().mockResolvedValue({
      id: tenantId, status: 'SUSPENDED',
      database: { databaseKey: 'shared-uk', mode: 'SHARED', status: 'ACTIVE' },
    }) } };
    await expect(new TenantRouter(control as never).resolve(tenantId)).rejects.toThrow('Tenant unavailable');
  });

  it('rejects dedicated databases assigned to multiple tenants', async () => {
    const control = { tenantRegistry: {
      findUnique: jest.fn().mockResolvedValue({
        id: tenantId, databaseId: 'db2', status: 'ACTIVE',
        database: { databaseKey: 'dedicated-1', mode: 'DEDICATED', region: 'uk', status: 'ACTIVE' },
      }),
      count: jest.fn().mockResolvedValue(2),
    } };
    await expect(new TenantRouter(control as never).resolve(tenantId)).rejects.toThrow(
      'Dedicated database must belong to exactly one tenant',
    );
  });
});
