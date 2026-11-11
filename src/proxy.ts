import { type NextRequest, NextResponse } from "next/server";

// The organiser session cookie (src/modules/auth/cookie.ts). Proxy runs apart
// from the app's modules (Next.js docs), so the name is repeated here.
const SESSION_COOKIE = "mmm_session";

/**
 * A quick first check before organiser pages render: without a session cookie
 * there's nothing to show, so go to log in and come back afterwards. The
 * pages themselves still check the session properly (src/app/(app)/layout.tsx).
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
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
    "/wedding/new",
  ],
};
