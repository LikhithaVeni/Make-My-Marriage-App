import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { SignupForm } from "@/components/auth/SignupForm";
import { Monogram } from "@/components/brand/Monogram";
import { AcceptInviteButton } from "@/components/members/AcceptInviteButton";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { formatDate } from "@/lib/format";
import { readSession } from "@/lib/session";
import { type InvitePreview, previewInvite } from "@/modules/wedding";
import { AppError } from "@/platform/errors";

export const metadata: Metadata = {
  title: "You're invited · Make My Marriage",
};

const linkClass =
  "rounded-control font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent";

const roleText = {
  ADMIN: "as an Admin, who can do everything",
  MANAGER: "as a Manager, who runs day-to-day planning",
} as const;

/** Who invited whom to which wedding: the top of every invite state. */
function InviteSummary({ invite }: { invite: InvitePreview }) {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-control border border-border bg-bg p-4">
      <Monogram initials={invite.wedding.monogram} />
      <div className="min-w-0">
        <p className="truncate font-display text-heading text-text">
          {invite.wedding.title}
        </p>
        <p className="text-small text-text-muted">
          {formatDate(invite.wedding.date, "long")}
        </p>
      </div>
    </div>
  );
}

/**
 * The organiser invite link (PRD F2): sign up with the invited email, log in,
 * or join straight away, depending on who opens it.
 */
export default async function InvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;

  let invite: InvitePreview;
  try {
    invite = await previewInvite(token);
  } catch (err) {
    unstable_rethrow(err);
    if (!(err instanceof AppError)) throw err;
    return (
      <AuthCard
        title={
          err.code === "TOKEN_USED"
            ? "This invite has been used"
            : err.code === "TOKEN_EXPIRED"
              ? "This invite has expired"
              : "This invite link isn't valid"
        }
        intro={
          err.code === "TOKEN_USED"
            ? "If you accepted it already, just log in."
            : err.code === "TOKEN_EXPIRED"
              ? "Invite links work for 7 days. Ask whoever invited you to send it again."
              : "It may have been cancelled or replaced by a newer invite. Check your latest email, or ask whoever invited you."
        }
      >
        <ButtonLink href="/login" className="w-full">
          Log in
        </ButtonLink>
      </AuthCard>
    );
  }

  const session = await readSession();
  const invitedBy = invite.invitedBy ?? "Your family";
  const intro = `${invitedBy} has invited you to help plan the wedding ${roleText[invite.role]}.`;
  const next = encodeURIComponent(`/invite/${token}`);

  if (!session) {
    return (
      <AuthCard title={`You're invited, ${invite.name}`} intro={intro}>
        <InviteSummary invite={invite} />
        <SignupForm
          invite={{ token, email: invite.email, name: invite.name }}
        />
        <p className="mt-6 text-center text-small text-text-muted">
          Already have an account?{" "}
          <Link href={`/login?next=${next}`} className={linkClass}>
            Log in to join
          </Link>
        </p>
      </AuthCard>
    );
  }

  const { user, wedding } = session.result;
  if (user.email !== invite.email) {
    return (
      <AuthCard title="This invite is for someone else" intro={intro}>
        <InviteSummary invite={invite} />
        <p className="text-text">
          It was sent to <span className="font-medium">{invite.email}</span>,
          but you&apos;re logged in as{" "}
          <span className="font-medium">{user.email}</span>.
        </p>
        <p className="mt-4 text-small text-text-muted">
          <LogoutButton />, then open the link again to join with the invited
          email.
        </p>
      </AuthCard>
    );
  }

  if (wedding) {
    return (
      <AuthCard title="You already belong to a wedding" intro={intro}>
        <InviteSummary invite={invite} />
        <p className="text-text">
          Your account is part of{" "}
          <span className="font-medium">{wedding.title}</span>. Each account can
          be in one wedding, so it can&apos;t join another.
        </p>
        <ButtonLink href="/dashboard" className="mt-6 w-full">
          Go to dashboard
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={`Welcome, ${user.name}`} intro={intro}>
      <InviteSummary invite={invite} />
      <AcceptInviteButton token={token} title={invite.wedding.title} />
    </AuthCard>
  );
}
