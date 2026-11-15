import { afterEach, describe, expect, it, vi } from "vitest";

import { sendEmail } from "@/platform/email";
import type { ServerEnv } from "@/platform/env";

const email = {
  to: "lakshmi@example.com",
  subject: "Ravi invited you to help plan KaLi's era",
  text: "Join here: http://localhost:3100/invite/abc",
};

const configured = {
  RESEND_API_KEY: "re_test_key",
  RESEND_FROM_EMAIL: "KaLi's era <hello@kalisera.in>",
} as ServerEnv;

afterEach(() => {
  vi.restoreAllMocks();
});

function quiet() {
  vi.spyOn(console, "info").mockImplementation(() => {});
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("sendEmail", () => {
  it("sends through Resend with the configured sender", async () => {
    quiet();
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ id: "1" }), { status: 200 }),
    );

    await sendEmail(email, {
      env: configured,
      fetchImpl,
      nodeEnv: "production",
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer re_test_key",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      from: "KaLi's era <hello@kalisera.in>",
      to: ["lakshmi@example.com"],
      subject: email.subject,
      text: email.text,
    });
  });

  it("logs a refusal (e.g. an unverified domain) instead of throwing", async () => {
    const error = quiet();
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            name: "validation_error",
            message: "The kalisera.in domain is not verified.",
          }),
          { status: 403 },
        ),
    );

    await expect(
      sendEmail(email, { env: configured, fetchImpl, nodeEnv: "production" }),
    ).resolves.toBeUndefined();
    expect(String(error.mock.calls[0]?.[0])).toContain(
      "The kalisera.in domain is not verified.",
    );
  });

  it("logs a network failure instead of throwing", async () => {
    const error = quiet();
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(
      sendEmail(email, { env: configured, fetchImpl, nodeEnv: "production" }),
    ).resolves.toBeUndefined();
    expect(String(error.mock.calls[0]?.[0])).toContain("Couldn't send");
  });

  it("without Resend set up, development prints the email and sends nothing", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchImpl = vi.fn();

    await sendEmail(email, {
      env: {} as ServerEnv,
      fetchImpl,
      nodeEnv: "development",
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(String(info.mock.calls[0]?.[0])).toContain(
      "To: lakshmi@example.com",
    );
  });

  it("in development with Resend set up, prints the email and sends it too", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));

    await sendEmail(email, {
      env: configured,
      fetchImpl,
      nodeEnv: "development",
    });

    expect(String(info.mock.calls[0]?.[0])).toContain("invite/abc");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("in production, never prints the email (links are secrets)", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));

    await sendEmail(email, {
      env: configured,
      fetchImpl,
      nodeEnv: "production",
    });

    expect(info).not.toHaveBeenCalled();
  });
});

describe("sendEmail through Gmail", () => {
  const gmail = {
    GMAIL_USER: "kalis.era.wedding@gmail.com",
    GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop",
    EMAIL_FROM_NAME: "KaLi's era",
  } as ServerEnv;

  it("sends from the Gmail account with the chosen name", async () => {
    quiet();
    const gmailSend = vi.fn(async () => ({ messageId: "1" }));

    await sendEmail(email, { env: gmail, gmailSend, nodeEnv: "production" });

    expect(gmailSend).toHaveBeenCalledWith({
      from: { name: "KaLi's era", address: "kalis.era.wedding@gmail.com" },
      to: "lakshmi@example.com",
      subject: email.subject,
      text: email.text,
    });
  });

  it("is used instead of Resend when both are set up", async () => {
    quiet();
    const gmailSend = vi.fn(async () => ({}));
    const fetchImpl = vi.fn();

    await sendEmail(email, {
      env: { ...configured, ...gmail },
      gmailSend,
      fetchImpl,
      nodeEnv: "production",
    });

    expect(gmailSend).toHaveBeenCalledOnce();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("names the sender Make My Marriage by default", async () => {
    quiet();
    const gmailSend = vi.fn(async () => ({}));

    await sendEmail(email, {
      env: { ...gmail, EMAIL_FROM_NAME: undefined },
      gmailSend,
      nodeEnv: "production",
    });

    expect(gmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: {
          name: "Make My Marriage",
          address: "kalis.era.wedding@gmail.com",
        },
      }),
    );
  });

  it("logs a refused login (e.g. a wrong app password) instead of throwing", async () => {
    const error = quiet();
    const gmailSend = vi.fn(async () => {
      throw new Error(
        "Invalid login: 535-5.7.8 Username and Password not accepted",
      );
    });

    await expect(
      sendEmail(email, { env: gmail, gmailSend, nodeEnv: "production" }),
    ).resolves.toBeUndefined();
    expect(String(error.mock.calls[0]?.[0])).toContain("Couldn't send");
  });
});
