import Link from "next/link";

import { LogoutButton } from "@/components/auth/LogoutButton";

/**
 * Bottom of the sidebar and mobile menu: who is signed in (a link to their
 * account: name and password) and Log out.
 */
export function AccountFooter({
  userName,
  onNavigate,
}: {
  userName: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-border px-6 py-3">
      <Link
        href="/account"
        onClick={onNavigate}
        title="Your account"
        className="min-h-11 min-w-0 flex-1 content-center truncate rounded-control text-small text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
      >
        {userName}
      </Link>
      <LogoutButton className="min-h-11 shrink-0 px-2 text-small" />
    </div>
  );
}
