import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Independent store credentials. Configure OMNICORE_STORE_TOKENS_JSON as a JSON
 * object keyed by store UUID. Never accept the global POS token for RTC access.
 */
export function verifyStoreCredential(header: string | undefined, storeId: string): boolean {
  if (!header?.startsWith('Bearer ') || !storeId) return false;
  let tokens: unknown;
  try { tokens = JSON.parse(process.env.OMNICORE_STORE_TOKENS_JSON || '{}'); }
  catch { return false; }
  if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) return false;
  const expected = (tokens as Record<string, unknown>)[storeId];
  if (typeof expected !== 'string' || expected.length < 24) return false;
  const supplied = header.slice(7);
  const left = createHash('sha256').update(supplied).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}
