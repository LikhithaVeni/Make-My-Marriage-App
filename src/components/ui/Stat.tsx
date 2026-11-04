interface StatProps {
  label: string;
  value: React.ReactNode;
  /** Short context under the value, e.g. "3,420 people". */
  detail?: React.ReactNode;
}

/** One headline number with its label, for totals and counts. */
export function Stat({ label, value, detail }: StatProps) {
  return (
    <div>
      <p className="text-small text-text-muted">{label}</p>
      <p className="mt-1 font-display text-title text-text">{value}</p>
      {detail && <p className="mt-1 text-small text-text-muted">{detail}</p>}
    </div>
  );
}
