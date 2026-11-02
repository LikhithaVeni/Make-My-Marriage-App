const sizes = {
  sm: "size-10 text-small",
  lg: "size-20 text-heading",
} as const;

interface MonogramProps {
  size?: keyof typeof sizes;
}

/** The "LK" brand mark: Fraunces lettering inside a thin maroon circle. */
export function Monogram({ size = "sm" }: MonogramProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-accent font-display font-medium tracking-wide text-accent ${sizes[size]}`}
    >
      LK
    </span>
  );
}
