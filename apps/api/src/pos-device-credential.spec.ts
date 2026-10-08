import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { issuePosCredential } from './pos-device-credential';
import { verifyDeviceCredential } from './pos-device-auth';

test('issued POS credential verifies with tenant, store and device', () => {
  const secret = 'test-device-secret-longer-than-32-characters';
  const tenantId = '00000000-0000-4000-8000-000000000001';
  const storeId = '00000000-0000-4000-8000-000000000002';
  const deviceId = '00000000-0000-4000-8000-000000000003';
  const credential = issuePosCredential(secret, tenantId, storeId, deviceId);
  assert.deepEqual(verifyDeviceCredential('Bearer ' + credential, secret), { tenantId, storeId, deviceId });
});

test('issuer rejects weak signing configuration', () => {
  assert.throws(() => issuePosCredential('short', 'tenant', 'store', 'device'));
});

test('POS credential issuer requires a signing secret', () => {
  assert.throws(() => issuePosCredential('', 'tenant', 'store', 'device'));
});
