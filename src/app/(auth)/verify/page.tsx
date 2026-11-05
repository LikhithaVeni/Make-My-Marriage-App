import type { Metadata } from "next";

import { AuthCard as Card } from "@/components/auth/AuthCard";
import { ConfirmEmail } from "@/components/auth/ConfirmEmail";
import { pathAfterAuth } from "@/components/auth/auth-client";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ResendButton } from "@/components/auth/ResendButton";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { readSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Confirm your email · Make My Marriage",
};

/**
 * PRD flow F1, step 2. With `?token=` (the emailed link) it confirms the
 * email; without, it asks the signed-in user to check their inbox.
 */
export default async function VerifyPage({
  searchParams,
}: PageProps<"/verify">) {
  const { token } = await searchParams;
  if (typeof token === "string" && token) {
    return (
      <Card title="Confirm your email">
        <ConfirmEmail token={token} />
      </Card>
    );
  }

  const session = await readSession();

  if (!session) {
    return (
      <Card title="Confirm your email">
        <p className="text-text-muted">
          Open the link in the email we sent you, or log in to send a new one.
        </p>
        <ButtonLink href="/login" className="mt-6 w-full">
          Log in
        </ButtonLink>
      </Card>
    );
  }

  const { user } = session.result;
  if (user.emailVerified) {
    return (
      <Card title="Email confirmed">
        <p className="text-text-muted">
          Thanks, {user.name}. Your email {user.email} is confirmed.
        </p>
        <ButtonLink
          href={pathAfterAuth(session.result)}
          className="mt-6 w-full"
        >
          {session.result.wedding
            ? "Go to the dashboard"
            : "Set up your wedding"}
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card title="Check your email">
      <p className="text-text-muted">
        We sent a link to{" "}
        <span className="font-medium text-text">{user.email}</span>. Open it to
        confirm your email, then you can set up your wedding.
      </p>
      <p className="mt-2 text-small text-text-muted">
        The link works for 24 hours. Can&apos;t find it? Check spam, or send a
        new one.
      </p>
      <div className="mt-6">
        <ResendButton />
      </div>
      <p className="mt-2 text-center text-small text-text-muted">
        Wrong email? <LogoutButton />, then sign up again.
      </p>
    </Card>
  );
}
