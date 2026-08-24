import { randomBytes, scrypt, timingSafeEqual } from "crypto";

/**
 * Password hashing.
 *
 * scrypt from Node's standard library rather than bcrypt or argon2: no native
 * build step, nothing to install, and it is memory-hard — which is the
 * property that actually matters when the threat is someone brute-forcing a
 * stolen table of hashes on a GPU.
 *
 * Cost parameters live *inside* each hash string, so raising them later is
 * free: existing hashes keep verifying with the numbers they were made with,
 * and `needsRehash` upgrades each one the next time its owner signs in.
 */

// N=2^15 → ~32 MiB and ~100ms per hash. Deliberately below OWASP's suggested
// 2^17: signup is open, so a burst of simultaneous logins each claiming 128 MiB
// is a cheap way for a stranger to push a small box into swap.
const N = 32_768;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
// scrypt refuses to allocate past this. It must exceed 128 * N * r.
const MAX_MEM = 192 * 1024 * 1024;

function derive(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> {
  // NFKC so that a password typed on a phone keyboard and the same password
  // typed on a desktop compare equal even when the Unicode differs.
  const normalized = password.normalize("NFKC");
  return new Promise((resolve, reject) => {
    scrypt(
      normalized,
      salt,
      KEY_LENGTH,
      { N: n, r, p, maxmem: MAX_MEM },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

/**
 * Verify a password against a stored hash.
 *
 * A null hash — an account created by a script, or one predating password
 * auth — is never a match, but still spends the same time as a real check so
 * that response timing doesn't reveal which accounts can be signed into.
 */
export async function verifyPassword(
  password: string,
  stored: string | null,
): Promise<boolean> {
  if (!stored) {
    await burnTime();
    return false;
  }

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    await burnTime();
    return false;
  }

  const [, nRaw, rRaw, pRaw, saltB64, keyB64] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    await burnTime();
    return false;
  }

  const expected = Buffer.from(keyB64, "base64");
  const salt = Buffer.from(saltB64, "base64");

  let key: Buffer;
  try {
    key = await derive(password, salt, n, r, p);
  } catch {
    // Corrupt or hostile parameters (an absurd N, say) — not a match.
    return false;
  }

  if (key.length !== expected.length) return false;
  return timingSafeEqual(key, expected);
}

/**
 * Spend roughly one verification's worth of work without checking anything.
 *
 * Called when there is no account for the submitted email, so that "no such
 * user" and "wrong password" take the same wall-clock time and the login form
 * can't be used to enumerate who has an account.
 */
export async function burnTime(): Promise<void> {
  await derive("", Buffer.alloc(16), N, R, P);
}

/** True when a stored hash was made with weaker parameters than we now use. */
export function needsRehash(stored: string | null): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return true;
  return Number(parts[1]) < N || Number(parts[2]) < R || Number(parts[3]) < P;
}
