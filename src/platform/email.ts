import "server-only";

// Outgoing email. Sending through Resend arrives with email verification and
// password reset (docs/decisions.md, decision 51); until then, development
// prints each email in the server terminal so its links can be followed.

export interface Email {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(email: Email): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.warn(`[email] Not sent ("${email.subject}"): email isn't set up.`);
    return;
  }
  console.info(
    `\n[email] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`,
  );
}
