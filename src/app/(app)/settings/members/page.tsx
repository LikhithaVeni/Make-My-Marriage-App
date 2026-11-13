import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/layout/TopBar";
import { InviteActions } from "@/components/members/InviteActions";
import { InviteForm } from "@/components/members/InviteForm";
import { MemberActions } from "@/components/members/MemberActions";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate, kolkataDateOf } from "@/lib/format";
import { readSession } from "@/lib/session";
import { listMembers, weddingPolicy } from "@/modules/wedding";
import { authorize } from "@/platform/rbac";

export const metadata: Metadata = {
  title: "Wedding members · Make My Marriage",
};

/** The round count beside a card title (Stitch "Wedding members — Settings"). */
function Count({ value }: { value: number }) {
  return (
    <span className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-bg text-caption font-medium text-text-muted">
      {value}
    </span>
  );
}

const roleLabel = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  PHOTOGRAPHER: "Photographer",
} as const;

/** PRD "Member management" (Admin only): invite, roles, remove. */
export default async function MembersPage() {
  const session = await readSession();
  if (session?.result.role !== "ADMIN") redirect("/dashboard");
  const ctx = authorize(session.context, weddingPolicy, "members.list");
  const { members, invites } = await listMembers(ctx);

  return (
    <>
      <TopBar title="Wedding members" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link
          href="/settings"
          className="self-start rounded-control text-small font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          ← Settings
        </Link>

        <Card title="Invite a family member">
          <p className="mb-5 text-text-muted">
            They get an email with a link to join{" "}
            {session.result.wedding?.title}. Admins can do everything; Managers
            run day-to-day planning but can&apos;t change members or wedding
            details.
          </p>
          <InviteForm />
        </Card>

        <Card title="Members" aside={<Count value={members.length} />}>
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const isYou = member.userId === ctx.userId;
              return (
                <li
                  key={member.userId}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-text">
                      <span className="truncate">{member.name}</span>
                      {isYou && (
                        <span className="text-small font-normal text-text-muted">
                          (you)
                        </span>
                      )}
                      <Badge
                        tone={member.role === "ADMIN" ? "accent" : "neutral"}
                      >
                        {roleLabel[member.role]}
                      </Badge>
                    </p>
                    <p className="truncate text-small text-text-muted">
                      {member.email}
                      {member.relationLabel && ` · ${member.relationLabel}`}
                    </p>
                  </div>
                  <MemberActions
                    userId={member.userId}
                    name={member.name}
                    role={member.role}
                    isYou={isYou}
                  />
                </li>
              );
            })}
          </ul>
        </Card>

        <Card
          title="Pending invites"
          aside={invites.length ? <Count value={invites.length} /> : undefined}
        >
          {invites.length === 0 ? (
            <p className="text-text-muted">
              No invites waiting. Invites you send appear here until
              they&apos;re accepted.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-text">
                      <span className="truncate">{invite.name}</span>
                      <Badge>{roleLabel[invite.role]}</Badge>
                      {invite.status === "EXPIRED" ? (
                        <Badge tone="danger">Expired</Badge>
                      ) : (
                        <Badge tone="warning">Pending</Badge>
                      )}
                    </p>
                    <p className="truncate text-small text-text-muted">
                      {invite.email}
                      {invite.relationLabel && ` · ${invite.relationLabel}`}
                    </p>
                    <p className="text-caption text-text-muted">
                      {invite.status === "EXPIRED"
                        ? "The link has expired; resend it for 7 more days."
                        : `Link works until ${formatDate(kolkataDateOf(invite.expiresAt))}`}
                      {invite.invitedBy && ` · Invited by ${invite.invitedBy}`}
                    </p>
                  </div>
                  <InviteActions inviteId={invite.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
