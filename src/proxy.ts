import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  sessionCookieOptions,
} from "@/lib/session-cookie";

/**
 * Route protection, optimistic half.
 *
 * This runs before every page and knows exactly one thing: whether a session
 * cookie is present. It does not — and must not — look in the database. Proxy
 * runs on prefetches too, so a query here would turn hovering a link into a
 * round trip.
 *
 * So this is a bouncer, not an auditor. The real check happens in
 * `src/lib/user.ts`, next to the data, where a Server Action called directly
 * cannot route around it.
 *
 * Note what is deliberately absent: sending a *cookie-bearing* visitor away
 * from /login. A cookie whose session was deleted server-side would bounce to
 * "/", get rejected by the data layer, bounce back to /login, and loop. The
 * login page handles that case itself with a real session lookup.
 */

const PUBLIC_PATHS = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Remember where they were headed so signing in lands them there rather
    // than dumping everyone on the home shelf.
    const intended = `${pathname}${search}`;
    if (intended !== "/") url.searchParams.set("next", intended);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  // Slide the cookie forward on every visit, so an account in daily use never
  // hits the 30-day wall. The matching row in the database slides too, once
  // the session is past halfway (see `getSessionUser`).
  if (token) {
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(new Date(Date.now() + SESSION_TTL_MS)),
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except:
     * - api      — route handlers answer with 401 themselves; redirecting an
     *              <img> to an HTML login page would just render a broken image
     * - _next/*  — build output and image optimisation
     * - the PWA and icon files, which are fetched without cookies
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)",
  ],
};
