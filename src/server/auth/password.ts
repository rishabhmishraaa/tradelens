// D10 / F3.5: password hashing with Node's built-in scrypt. No auth library.
// Pure (no Next.js imports) so scripts/hash-password.ts can run it directly with Node.
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))),
  );

const N = 16384; // CPU/memory cost
const r = 8;
const p = 1;
const KEY_LENGTH = 64;

/**
 * Format: scrypt:N:r:p:salt:hash (salt and hash in base64url).
 * Deliberately no "$": Next.js expands "$NAME" inside .env files, which would corrupt the hash.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, { N, r, p });
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join(":");
}

/** Returns false (never throws) for a wrong password or a malformed stored hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [cost, blockSize, parallel] = parts.slice(1, 4).map(Number);
  if (![cost, blockSize, parallel].every(Number.isSafeInteger)) return false;
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (salt.length === 0 || expected.length === 0) return false;
  try {
    const actual = await scrypt(password, salt, expected.length, { N: cost, r: blockSize, p: parallel });
    // Constant-time comparison: timing doesn't reveal how many bytes matched.
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
