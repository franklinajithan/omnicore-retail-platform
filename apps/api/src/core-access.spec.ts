import { test } from 'node:test';
import { createHmac } from 'node:crypto';
import { verifyCoreToken } from './core-access';

const secret = 'integration-test-secret-at-least-32-characters';
function sign(payload: Record<string, unknown>, key = secret): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', key).update(header + '.' + body).digest('base64url');
  return 'Bearer ' + header + '.' + body + '.' + signature;
}
const claims = () => ({ sub: 'employee-1', tenantId: '00000000-0000-4000-8000-000000000001', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 });
function assert(condition: unknown, description: string): void {
  if (!condition) throw new Error(description);
}
function rejects(run: () => unknown, description: string): void {
  let rejected = false;
  try { run(); } catch { rejected = true; }
  assert(rejected, description);
}
export function runCoreAuthTests(): void {
  const token = sign(claims());
  const valid = verifyCoreToken(token, secret);
  assert(valid.userId === 'employee-1', 'Valid identity must resolve');
  assert(valid.tenantId === claims().tenantId, 'Tenant must come from signed claims');
  rejects(() => verifyCoreToken(token, 'wrong-secret-with-at-least-32-characters'), 'Incorrect signature must fail');
  rejects(() => verifyCoreToken(token.slice(0, -3) + 'abc', secret), 'Tampering must fail');
  rejects(() => verifyCoreToken(sign({ ...claims(), exp: 1 }), secret), 'Expired tokens must fail');
  rejects(() => verifyCoreToken(sign({ ...claims(), tenantId: 'other' }), secret), 'Invalid tenant must fail');
  rejects(() => verifyCoreToken(sign({ ...claims(), iat: undefined }), secret), 'Missing issued-at must fail');
  rejects(() => verifyCoreToken(undefined, secret), 'Missing authorization must fail');
  rejects(() => verifyCoreToken(token, undefined), 'Missing configured secret must fail');
}

test('core JWT authentication rejects invalid credentials', runCoreAuthTests);
