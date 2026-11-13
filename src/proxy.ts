import { type NextRequest, NextResponse } from "next/server";

// The organiser session cookie (src/modules/auth/cookie.ts). Proxy runs apart
// from the app's modules (Next.js docs), so its name and lifetime are
// repeated here.
const SESSION_COOKIE = "mmm_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * A quick first check before organiser pages render: without a session cookie
 * there's nothing to show, so go to log in and come back afterwards. The
 * pages themselves still check the session properly (src/app/(app)/layout.tsx).
 *
 * With a cookie, its 30 days start again on every visit, so the session
 * slides while the app is in use (System Design). Pages can't set cookies,
 * so this is where the browser's copy is renewed; the database's expiry,
 * which the pages slide, stays the authority.
 */
export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session) {
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  }

  const login = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // The (app) and (setup) pages from System Design's project structure.
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
    "/tasks/:path*",
    "/expenses/:path*",
    "/vendors/:path*",
    "/guests/:path*",
    "/gallery/:path*",
    "/settings/:path*",
    "/activity/:path*",
    "/notifications/:path*",
    "/account",
    "/wedding/new",
  ],
};
