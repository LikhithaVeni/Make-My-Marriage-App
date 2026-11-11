import type { APIRequestContext } from "@playwright/test";

import { E2E_USER } from "./e2e-db";

/** Logs the seeded organiser in; the request context keeps the cookie. */
export async function logIn(request: APIRequestContext) {
  const response = await request.post("/api/v1/auth/login", {
    headers: { "X-Requested-With": "mmm" },
    data: { email: E2E_USER.email, password: E2E_USER.password },
  });
  if (response.status() !== 200) {
    throw new Error(
      `Log in failed: ${response.status()} ${await response.text()}`,
    );
  }
}
