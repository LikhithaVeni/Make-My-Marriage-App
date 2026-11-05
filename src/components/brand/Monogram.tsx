const sizes = {
  sm: "size-10 text-small",
  lg: "size-20 text-heading",
} as const;

interface MonogramProps {
  /** The couple's initials, e.g. "LK". */
  initials: string;
  size?: keyof typeof sizes;
}

/** A wedding's mark: the couple's initials in Fraunces inside a thin maroon circle. */
export function Monogram({ initials, size = "sm" }: MonogramProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-accent font-display font-medium tracking-wide text-accent ${sizes[size]}`}
    >
      {initials}
    </span>
  );
}
