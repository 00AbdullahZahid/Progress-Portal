import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "portal_session";

/**
 * Defense-in-depth auth check.
 *
 * Middleware runs on the Edge runtime, so it cannot verify the JWT signature or
 * hit the database. It only checks for the *presence* of a session cookie on
 * protected paths and bounces obviously-unauthenticated requests to /login.
 *
 * This is a fast first gate, not the source of truth. Every page and server
 * action still calls requireUser()/requireAdmin(), which verify the signature,
 * user existence, isActive, and tokenVersion.
 */
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(COOKIE)?.value);

  // Send signed-out visitors straight to the login page.
  // The cookie may be stale/invalid, but the page-level check will catch that.
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except: the login page, auth API surface, Next internals,
  // and static files. Anything not listed here still gets per-page checks.
  matcher: [
    "/dashboard/:path*",
    "/tasks/:path*",
    "/habits/:path*",
    "/study/:path*",
    "/chat/:path*",
    "/people/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
