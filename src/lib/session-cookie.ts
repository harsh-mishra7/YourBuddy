/**
 * The cookie contract, kept dependency-free on purpose.
 *
 * `proxy.ts` runs in front of the app and must not pull in Prisma or
 * `next/headers` just to learn what the cookie is called — so the name, the
 * lifetime, and the flags live here, and both sides import them. One
 * definition means the proxy and the session layer cannot drift apart.
 */

export const SESSION_COOKIE = "yb_session";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

/** Past the halfway mark, using a session extends it. Sliding, not fixed. */
export const SESSION_RENEW_AFTER_MS = SESSION_TTL_MS / 2;

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    // Not in development — the dev server is plain http, and a Secure cookie
    // there would simply never be stored.
    secure: process.env.NODE_ENV === "production",
    // "lax" still sends the cookie when you follow a link into the app, but
    // withholds it from cross-site POSTs, which is the CSRF-relevant case.
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
