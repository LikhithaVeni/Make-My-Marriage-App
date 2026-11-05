import Link from "next/link";

import { Wordmark } from "@/components/brand/Wordmark";
import { ButtonLink } from "@/components/ui/ButtonLink";

const sections = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "For guests", href: "/#for-guests" },
];

const linkClass =
  "rounded-control px-3 py-2 text-small text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-accent";

/** Landing page header: product name, section links (from 768px), Log in and Sign up. */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-8">
        <Link
          href="/"
          className="rounded-control focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Wordmark />
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

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/login"
            className={`${linkClass} min-h-11 content-center`}
          >
            Log in
          </Link>
          {/* On phones the hero's own Sign up button is just below. */}
          <div className="hidden sm:block">
            <ButtonLink href="/signup">Sign up</ButtonLink>
          </div>
        </div>
      </div>
    </header>
  );
}
