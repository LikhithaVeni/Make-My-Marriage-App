import Link from "next/link";

import { Monogram } from "@/components/brand/Monogram";
import { ButtonLink } from "@/components/ui/ButtonLink";

const sections = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "For guests", href: "#for-guests" },
];

const linkClass =
  "rounded-control px-3 py-2 text-small text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-accent";

/** Landing page header: brand, section links (from 768px), log in and dashboard. */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Monogram />
          <span className="font-display font-medium text-accent">
            KaLi&apos;s era
          </span>
        </Link>

        <nav aria-label="Sections" className="mx-auto hidden md:block">
          <ul className="flex gap-2">
            {sections.map((section) => (
              <li key={section.href}>
                <a href={section.href} className={linkClass}>
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            href="/login"
            className={`${linkClass} min-h-11 content-center`}
          >
            Log in
          </Link>
          {/* On phones the hero's own button is just below. */}
          <div className="hidden sm:block">
            <ButtonLink href="/dashboard">Open dashboard</ButtonLink>
          </div>
        </div>
      </div>
    </header>
  );
}
