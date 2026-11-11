"use client";

import { usePathname } from "next/navigation";

import { ButtonLink } from "@/components/ui/ButtonLink";

import type { LandingAccount } from "./landing-account";

/**
 * The header's right side for a signed-in visitor: their name and a button
 * back in. The button hides on the page it would open, e.g. "Continue setup"
 * on the confirm-email page itself.
 */
export function AccountActions({ account }: { account: LandingAccount }) {
  const pathname = usePathname();
  return (
    <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3 md:ml-0">
      <span className="hidden truncate text-small text-text-muted sm:inline">
        {account.name}
      </span>
      {pathname !== account.href && (
        <ButtonLink href={account.href} className="shrink-0 max-sm:px-4">
          <span className="sm:hidden">{account.shortLabel}</span>
          <span className="hidden sm:inline">{account.label}</span>
        </ButtonLink>
      )}
    </div>
  );
}
