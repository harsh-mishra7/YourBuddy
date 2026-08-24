import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_RENEW_AFTER_MS,
  SESSION_TTL_MS,
  currentSessionToken,
  hashToken,
} from "@/lib/session";

/**
 * The data access layer for identity.
 *
 * §3 promised that opening the app up would cost "a login screen rather than a
 * migration of every table". This file is that screen's server half — it is
 * still the one place that decides *who am I*, it just answers from a session
 * now instead of an environment variable.
 *
 * Everything that touches user data goes through here. Route protection in
 * `proxy.ts` is an optimistic convenience — it only sees a cookie, never a
 * session — so the real check has to live next to the data, where it cannot be
 * skipped by calling a Server Action directly.
 */

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

/**
 * The signed-in user, or null.
 *
 * `cache` memoises this for the render pass, so a layout, a page, and three
 * components asking "who am I" cost one query rather than five.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = await currentSessionToken();
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  // No row: signed out elsewhere, or a cookie forged by hand. Same answer.
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {
      /* a concurrent request may have collected it first */
    });
    return null;
  }

  // Slide the window, but only once past the halfway mark — otherwise every
  // page view of a busy session becomes a write.
  const elapsed = Date.now() - session.lastActiveAt.getTime();
  if (elapsed > SESSION_RENEW_AFTER_MS) {
    await prisma.session
      .update({
        where: { id: session.id },
        data: {
          lastActiveAt: new Date(),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      })
      .catch(() => {
        /* renewal is best-effort; the session is still valid without it */
      });
  }

  return session.user;
});

/**
 * The signed-in user, or a redirect to the login screen.
 *
 * This is the function to reach for. Returning null and letting the caller
 * decide is how a page ends up rendering someone else's shelf because one
 * branch forgot to check.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Kept because every query and action already calls it — the signature is the
 * same as it was when there was one user, so multi-user cost those files
 * nothing.
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await requireUser();
  return user.id;
}
