interface FormAlertProps {
  title: string;
  children?: React.ReactNode;
}

/** The error box at the top of an auth form, e.g. "Incorrect email or password." */
export function FormAlert({ title, children }: FormAlertProps) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-control border border-danger/30 p-4 text-small"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="mt-0.5 size-5 shrink-0 text-danger"
      >
        <circle cx="10" cy="10" r="10" fill="currentColor" />
        <path
          d="M10 5.5v5.5M10 14.2v.3"
          className="stroke-surface"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <div>
        <p className="font-medium text-danger">{title}</p>
        {children && <div className="mt-1 text-text-muted">{children}</div>}
      </div>
    </div>
  );
}
