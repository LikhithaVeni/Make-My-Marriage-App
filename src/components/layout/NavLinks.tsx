"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useWeddingBrand } from "@/components/layout/wedding-brand";

interface NavItem {
  label: string;
  href: string;
  /** False until the page exists; shown as "Soon" instead of a dead link. */
  available: boolean;
}

// Every organiser area from the Screens table in docs/PRD_v1.md (mapping in
// docs/decisions.md). Used by both the desktop sidebar and the mobile menu.
const mainItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", available: true },
  { label: "Events", href: "/events", available: false },
  { label: "Tasks", href: "/tasks", available: false },
  { label: "Guests", href: "/guests", available: false },
  { label: "Invitations", href: "/invitations", available: false },
  { label: "Expenses", href: "/expenses", available: false },
  { label: "Vendors", href: "/vendors", available: false },
  {
    label: "Wedding-day contacts",
    href: "/vendors/contacts",
    available: false,
  },
  { label: "Gallery", href: "/gallery", available: false },
  { label: "Website & livestream", href: "/website", available: false },
  { label: "Activity", href: "/activity", available: false },
];

// Admin only (PRD screens: Settings is for Admins), so it isn't shown to
// Managers at all.
const settingsItem: NavItem = {
  label: "Settings",
  href: "/settings",
  available: true,
};

/** The most specific item whose href matches the current path. */
function activeHref(pathname: string): string | undefined {
  return [...mainItems, settingsItem]
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

const itemClass =
  "flex min-h-11 items-center justify-between gap-3 rounded-control px-3 text-small";

function NavEntry({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  if (!item.available) {
    return (
      <span aria-disabled="true" className={`${itemClass} text-text-muted`}>
        {item.label}
        <span className="text-caption">Soon</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`${itemClass} font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
        active ? "bg-accent-tint text-accent" : "text-text hover:bg-accent-tint"
      }`}
    >
      {item.label}
    </Link>
  );
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const current = activeHref(usePathname());
  const { role } = useWeddingBrand();

  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-4 px-3 pb-4">
      <ul className="flex flex-col gap-1">
        {mainItems.map((item) => (
          <li key={item.href}>
            <NavEntry
              item={item}
              active={item.href === current}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
      {role === "ADMIN" && (
        <ul className="mt-auto border-t border-border pt-4">
          <li>
            <NavEntry
              item={settingsItem}
              active={settingsItem.href === current}
              onNavigate={onNavigate}
            />
          </li>
        </ul>
      )}
    </nav>
  );
}
