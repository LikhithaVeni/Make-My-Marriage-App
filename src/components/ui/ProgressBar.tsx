const tones = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  muted: "bg-text-muted",
} as const;

/** Whole percent of `value` out of `max`, kept within 0–100. */
export function progressPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

interface ProgressBarProps {
  value: number;
  max: number;
  /** Read by screen readers, e.g. "Tasks completed". */
  label: string;
  tone?: keyof typeof tones;
}

/** A thin horizontal bar showing `value` out of `max`. */
export function ProgressBar({
  value,
  max,
  label,
  tone = "accent",
}: ProgressBarProps) {
  const percent = progressPercent(value, max);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 overflow-hidden rounded-full bg-border"
    >
      <div
        className={`h-full rounded-full ${tones[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
