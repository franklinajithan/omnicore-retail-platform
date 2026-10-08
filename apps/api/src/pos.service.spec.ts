import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { PosService } from './pos.service';

const scope = {
  tenantId: '00000000-0000-4000-8000-000000000001',
  storeId: '00000000-0000-4000-8000-000000000002',
  deviceId: '00000000-0000-4000-8000-000000000003'
};

test('registered and enabled POS device is authorized', async () => {
  let where: any;
  const service = new PosService({
    storeTrustedDevice: {
      findFirst: async (query: any) => { where = query.where; return { id: scope.deviceId }; }
    }
  } as any);
  await service.authorizeDevice(scope);
  assert.deepEqual(where, {
    id: scope.deviceId,
    storeId: scope.storeId,
    enabled: true,
    store: { tenantId: scope.tenantId }
  });
});

test('unknown or disabled POS device is rejected', async () => {
  const service = new PosService({
    storeTrustedDevice: { findFirst: async () => null }
  } as any);
  await assert.rejects(() => service.authorizeDevice(scope), /DEVICE_REVOKED_OR_UNREGISTERED/);
});
