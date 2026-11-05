import { LogoutButton } from "@/components/auth/LogoutButton";

/** Bottom of the sidebar and mobile menu: who is signed in, and Log out. */
export function AccountFooter({ userName }: { userName: string }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-border px-6 py-3">
      <span className="min-w-0 flex-1 truncate text-small text-text-muted">
        {userName}
      </span>
      <LogoutButton className="min-h-11 shrink-0 px-2 text-small" />
    </div>
  );
}
