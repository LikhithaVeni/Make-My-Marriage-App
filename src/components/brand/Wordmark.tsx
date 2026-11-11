/**
 * The product's mark: two linked rings with shine lines in a filled maroon
 * circle, then "Make My Marriage" in Fraunces maroon. The filled circle keeps it distinct
 * from a wedding's monogram (its initials in a thin outlined circle), since
 * weddings inside the product have their own names such as "KaLi's era"
 * (docs/decisions.md, decision 48).
 */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-surface"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="size-6"
        >
          {/* Two linked rings with a fan of shine lines above them. */}
          <ellipse cx="8.5" cy="15.5" rx="5.5" ry="4.5" />
          <ellipse cx="15.5" cy="15.5" rx="5.5" ry="4.5" />
          <path d="M12 3v3M7.5 4.5l1.2 2.4M16.5 4.5l-1.2 2.4M3.8 7.2l1.8 1.6M20.2 7.2l-1.8 1.6" />
        </svg>
      </span>
      <span className="font-display text-body font-medium whitespace-nowrap text-accent">
        Make My Marriage
      </span>
    </span>
  );
}
