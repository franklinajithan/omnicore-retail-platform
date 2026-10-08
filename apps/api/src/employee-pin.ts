import {randomBytes, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';

const scrypt = promisify(scryptCallback);
const PIN_PATTERN = new RegExp('^[0-9]{6}$');

/** Use a tenant-specific keyed identifier to locate an employee before verifying their PIN.
 * A six-digit PIN has only one million possibilities: hashing does not make offline theft harmless.
 * Never log, return or store the plaintext PIN. */
export function validatePin(pin: string): void {
  if (!PIN_PATTERN.test(pin)) throw new Error('PIN must contain exactly six digits');
}

export async function hashEmployeePin(pin: string): Promise<string> {
  validatePin(pin);
  const salt = randomBytes(24);
  const hash = await scrypt(pin, salt, 64) as Buffer;
  return 'scrypt:v1:' + salt.toString('hex') + ':' + hash.toString('hex');
}

export async function verifyEmployeePin(pin: string, encoded: string): Promise<boolean> {
  if (!PIN_PATTERN.test(pin)) return false;
  const parts = encoded.split(':');
  if (parts.length !== 4 || parts[0] !== 'scrypt' || parts[1] !== 'v1') return false;
  const salt = Buffer.from(parts[2], 'hex');
  const expected = Buffer.from(parts[3], 'hex');
  if (salt.length !== 24 || expected.length !== 64) return false;
  const actual = await scrypt(pin, salt, expected.length) as Buffer;
  return timingSafeEqual(actual, expected);
}
