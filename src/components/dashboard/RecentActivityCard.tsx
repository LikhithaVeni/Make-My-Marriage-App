import { Card, CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatTimeAgo } from "@/lib/format";
import type { Dashboard } from "@/modules/dashboard";

interface RecentActivityCardProps {
  activity: Dashboard["recentActivity"];
  className?: string;
}

/** The latest changes from the activity log, newest first (PRD, "Recent activity"). */
export function RecentActivityCard({
  activity,
  className,
}: RecentActivityCardProps) {
  return (
    <Card
      title="Recent activity"
      className={className}
      footer={
        <CardLink
          label="View full activity log"
          href="/activity"
          available={false}
        />
      }
    >
      {activity.length === 0 ? (
        <EmptyState
          title="Nothing yet"
          description="Changes by the family show here as they happen."
        />
      ) : (
        <ul className="divide-y divide-border">
          {activity.map((entry) => (
            <li
              key={`${entry.at}-${entry.summary}`}
              className="flex items-center gap-3 py-3"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-tint font-display text-small font-medium text-accent"
              >
                {entry.actorName.charAt(0).toUpperCase()}
              </span>
              <p className="min-w-0 flex-1 text-text">{entry.summary}</p>
              <time
                dateTime={entry.at}
                className="shrink-0 text-small text-text-muted"
              >
                {formatTimeAgo(entry.at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
