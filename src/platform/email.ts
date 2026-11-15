import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { getServerEnv, isConfigured, type ServerEnv } from "@/platform/env";

// Outgoing email (docs/decisions.md, decision 64). Sent through a Gmail
// account when one is set up (free, no domain needed), otherwise through
// Resend, otherwise not at all. In development every email is also printed in
// the server terminal, so its links can be followed whatever happens.

export interface Email {
  to: string;
  subject: string;
  text: string;
}

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;
const DEFAULT_FROM_NAME = "Make My Marriage";

interface GmailMessage {
  from: { name: string; address: string };
  to: string;
  subject: string;
  text: string;
}

interface SendOptions {
  env?: ServerEnv;
  nodeEnv?: string;
  fetchImpl?: typeof fetch;
  /** For tests: replaces the Gmail connection. */
  gmailSend?: (message: GmailMessage) => Promise<unknown>;
}

// One Gmail connection per account, reused across emails.
let gmail: { user: string; transporter: Transporter } | undefined;

function gmailTransporter(user: string, pass: string): Transporter {
  if (gmail?.user !== user) {
    gmail = {
      user,
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
        connectionTimeout: TIMEOUT_MS,
        greetingTimeout: TIMEOUT_MS,
        socketTimeout: TIMEOUT_MS,
      }),
    };
  }
  return gmail.transporter;
}

async function sendThroughResend(
  email: Email,
  env: ServerEnv,
  fetchImpl: typeof fetch,
) {
  const response = await fetchImpl(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [email.to],
      subject: email.subject,
      text: email.text,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    // Resend's error says why, e.g. the sender's domain isn't verified.
    const body = (await response.json().catch(() => null)) as {
      name?: string;
      message?: string;
    } | null;
    console.error(
      `[email] Resend refused "${email.subject}" (${response.status} ${body?.name ?? ""}): ${body?.message ?? "no details"}`,
    );
  }
}

/**
 * Sends one email. It never throws: an email that can't be sent must not
 * undo what caused it (a sign-up, an invite, a reset), so a failure is
 * logged, and the user can ask again (Resend, Resend email).
 */
export async function sendEmail(
  email: Email,
  {
    env = getServerEnv(),
    nodeEnv = process.env.NODE_ENV,
    fetchImpl = fetch,
    gmailSend,
  }: SendOptions = {},
): Promise<void> {
  if (nodeEnv !== "production") {
    console.info(
      `\n[email] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`,
    );
  }

  try {
    if (isConfigured("gmail", env)) {
      const message: GmailMessage = {
        from: {
          name: env.EMAIL_FROM_NAME || DEFAULT_FROM_NAME,
          address: env.GMAIL_USER!,
        },
        to: email.to,
        subject: email.subject,
        text: email.text,
      };
      const send =
        gmailSend ??
        ((m: GmailMessage) =>
          gmailTransporter(env.GMAIL_USER!, env.GMAIL_APP_PASSWORD!).sendMail(
            m,
          ));
      await send(message);
      return;
    }
    if (isConfigured("email", env)) {
      await sendThroughResend(email, env, fetchImpl);
      return;
    }
  } catch (err) {
    console.error(`[email] Couldn't send "${email.subject}".`, err);
    return;
  }

  if (nodeEnv === "production") {
    console.warn(`[email] Not sent ("${email.subject}"): email isn't set up.`);
  }
}
