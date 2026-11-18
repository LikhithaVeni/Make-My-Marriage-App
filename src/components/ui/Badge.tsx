// Status colours stay in text and borders, never large fills
// (docs/design-system.md, "Contrast").
const tones = {
  neutral: "border-border text-text-muted",
  accent: "border-accent/30 bg-accent-tint text-accent",
  success: "border-success/30 text-success",
  warning: "border-warning/30 text-warning",
  danger: "border-danger/30 text-danger",
} as const;

export type BadgeTone = keyof typeof tones;

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
}

/** A small pill label: priority, status, an event name. */
export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    // A long label (an 80-character event name) is cut with "…" rather than
    // widening the page; the full text stays available as a tooltip.
    <span
      title={typeof children === "string" ? children : undefined}
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-caption font-medium whitespace-nowrap ${tones[tone]}`}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
