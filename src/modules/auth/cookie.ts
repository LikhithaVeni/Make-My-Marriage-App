// The organiser session cookie (System Design, "Authentication, sessions and
// permissions"): httpOnly, Secure, SameSite=Lax, 30 days and sliding.
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "mmm_session";

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Browsers drop Secure cookies on plain http://, except on localhost;
    // development runs on http, so Secure is set in production only.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
