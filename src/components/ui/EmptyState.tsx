interface EmptyStateProps {
  title: string;
  description?: string;
  /** An action, such as a link to add the first item. */
  children?: React.ReactNode;
}

/** What a card shows when it has nothing yet, e.g. "No tasks assigned to you". */
export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-1 py-6 text-center">
      <p className="font-medium text-text">{title}</p>
      {description && (
        <p className="max-w-xs text-small text-text-muted">{description}</p>
      )}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
