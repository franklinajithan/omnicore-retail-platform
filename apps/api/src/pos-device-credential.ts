import { createHmac, randomBytes } from 'node:crypto';

export function issuePosCredential(secret: string, tenantId: string, storeId: string, deviceId: string) {
  if (!secret || secret.length < 32) throw new Error('POS signing secret must be configured');
  const iat = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ tenantId, storeId, deviceId, iat, exp: iat + 3600 })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + signature;
}

export function newDeviceCredentialHash() {
  return randomBytes(32).toString('hex');
}
