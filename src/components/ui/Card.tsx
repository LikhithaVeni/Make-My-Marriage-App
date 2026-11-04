import Link from "next/link";

interface CardProps {
  title: string;
  /** Right side of the header: a count, a badge or a short note. */
  aside?: React.ReactNode;
  /** Bottom row, separated by a rule; usually a CardLink. */
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** The card surface (docs/design-system.md, "Cards"), shared by every card-shaped panel. */
export const cardSurface = "rounded-card border border-border bg-surface";

function headingId(title: string): string {
  return `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/** A titled white panel on the ivory page (docs/design-system.md, "Cards"). */
export function Card({ title, aside, footer, className, children }: CardProps) {
  const id = headingId(title);

  return (
    <section
      aria-labelledby={id}
      className={`flex flex-col p-6 ${cardSurface} ${className ?? ""}`}
    >
      <header className="flex items-start justify-between gap-4">
        <h2 id={id} className="font-display text-heading text-text">
          {title}
        </h2>
        {aside && (
          <div className="shrink-0 pt-1 text-small text-text-muted">
            {aside}
          </div>
        )}
      </header>
      <div className="mt-4 flex-1">{children}</div>
      {footer && (
        <footer className="mt-6 border-t border-border pt-2">{footer}</footer>
      )}
    </section>
  );
}

interface CardLinkProps {
  label: string;
  href: string;
  /** False until the page exists; shown as "Soon" instead of a dead link. */
  available: boolean;
}

/** The "View all" link at the bottom of a card. */
export function CardLink({ label, href, available }: CardLinkProps) {
  if (!available) {
    return (
      <span
        aria-disabled="true"
        className="flex min-h-11 items-center justify-between gap-3 text-small text-text-muted"
      >
        {label}
        <span className="text-caption">Soon</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between gap-3 rounded-control text-small font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
    >
      {label}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
