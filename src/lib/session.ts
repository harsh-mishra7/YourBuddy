import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  sessionCookieOptions,
} from "@/lib/session-cookie";

/**
 * Sessions.
 *
 * Database-backed rather than a signed JWT, for one reason that matters more
 * than the extra query: sign-out has to be *real*. Deleting a row ends the
 * session everywhere immediately; a stateless token stays valid until it
 * expires no matter how many times you click "sign out".
 *
 * The cookie holds a random opaque token. The database holds only its SHA-256,
 * so a leaked dump contains nothing that can be replayed as a login.
 */

// Re-exported so callers have one import for "sessions" — the constants live
// in a dependency-free module because `proxy.ts` needs them too.
export {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  SESSION_RENEW_AFTER_MS,
  sessionCookieOptions,
} from "@/lib/session-cookie";

/**
 * SHA-256 and not a slow KDF on purpose: the token is 256 bits of CSPRNG
 * output, so there is no low-entropy secret to brute-force and nothing for a
 * work factor to protect. It only needs to be a one-way lookup key.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Issue a session and put its token in the response cookie. */
export async function createSession(
  userId: string,
  userAgent?: string | null,
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: userAgent?.slice(0, 300) ?? null,
    },
  });

  // Opportunistic cleanup — expired rows are dead weight and this is the one
  // moment we know a write is already happening.
  await prisma.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {
      /* housekeeping must never fail a login */
    });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

/** End the current session — the row first, then the cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => {
        /* already gone — signing out twice is not an error */
      });
  }

  store.delete(SESSION_COOKIE);
}

/**
 * End every session for a user.
 *
 * `exceptToken` keeps the caller signed in, which is what you want after a
 * password change: kick out the other devices, stay logged in on this one.
 */
export async function destroyAllSessions(
  userId: string,
  exceptToken?: string | null,
): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: {
      userId,
      ...(exceptToken ? { tokenHash: { not: hashToken(exceptToken) } } : {}),
    },
  });
  return count;
}

/** The raw token from the request cookie, if any. */
export async function currentSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}
