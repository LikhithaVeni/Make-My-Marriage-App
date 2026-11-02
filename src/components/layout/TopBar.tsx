import { MobileNav } from "@/components/layout/MobileNav";

/** Page header with the page title, the mobile menu button and the notifications bell. */
export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 md:px-8">
      <MobileNav />
      <h1 className="truncate font-display text-heading">{title}</h1>
      {/* Placeholder until notifications are built (PRD: a bell shows unread in-app notifications). */}
      <button
        type="button"
        disabled
        aria-label="Notifications (coming soon)"
        title="Notifications (coming soon)"
        className="-mr-2 ml-auto inline-flex size-11 shrink-0 items-center justify-center rounded-control text-text-muted"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
        >
          <path d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6 2 7H4c.5-1 2-2.5 2-7Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      </button>
    </header>
  );
}
