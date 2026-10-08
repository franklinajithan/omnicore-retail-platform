import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHmac } from 'node:crypto';
import { verifyDeviceCredential } from './pos-device-auth';

const secret = 'device-test-secret-at-least-32-characters';
const tenantId = '00000000-0000-4000-8000-000000000001';
const storeId = '00000000-0000-4000-8000-000000000002';
const deviceId = '00000000-0000-4000-8000-000000000003';
function token(data: Record<string, unknown>, key = secret): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return 'Bearer ' + payload + '.' + createHmac('sha256', key).update(payload).digest('base64url');
}
function claims() {
  const now = Math.floor(Date.now() / 1000);
  return { tenantId, storeId, deviceId, iat: now, exp: now + 300 };
}
test('POS device token validates tenant and store', () => {
  assert.deepEqual(verifyDeviceCredential(token(claims()), secret), { tenantId, storeId, deviceId });
});
test('POS device credentials reject tampering and missing configuration', () => {
  assert.throws(() => verifyDeviceCredential(token(claims(), 'wrong-key-with-at-least-32-characters'), secret));
  assert.throws(() => verifyDeviceCredential(token(claims()), undefined));
  assert.throws(() => verifyDeviceCredential(undefined, secret));
});
test('POS device credentials reject invalid scope and expired tokens', () => {
  assert.throws(() => verifyDeviceCredential(token({ ...claims(), tenantId: 'other' }), secret));
  assert.throws(() => verifyDeviceCredential(token({ ...claims(), exp: 1 }), secret));
  assert.throws(() => verifyDeviceCredential(token({ ...claims(), exp: claims().iat + 172800 }), secret));
});
