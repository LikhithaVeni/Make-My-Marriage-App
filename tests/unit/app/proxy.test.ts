import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3100${path}`, {
    headers: cookie ? { cookie } : {},
  });

describe("proxy", () => {
  it("sends a visitor without a session to log in, keeping the page", () => {
    const response = proxy(request("/tasks?mine=1"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/tasks?mine=1");
  });

  it("lets a session through and starts its 30 days again", () => {
    const response = proxy(request("/dashboard", "mmm_session=abc123"));
    expect(response.headers.get("location")).toBeNull();
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("mmm_session=abc123");
    expect(cookie).toContain("Max-Age=2592000");
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
  });
});
