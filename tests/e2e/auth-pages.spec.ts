import { expect, test } from "@playwright/test";

test("the log in and sign up pages render their forms", async ({ request }) => {
  const login = await request.get("/login");
  expect(login.status()).toBe(200);
  const loginHtml = await login.text();
  expect(loginHtml).toContain("Welcome back");
  expect(loginHtml).toContain("Create your wedding");

  const signup = await request.get("/signup");
  expect(signup.status()).toBe(200);
  const signupHtml = await signup.text();
  expect(signupHtml).toContain("Create your account");
  expect(signupHtml).toContain("At least 10 characters.");
});
