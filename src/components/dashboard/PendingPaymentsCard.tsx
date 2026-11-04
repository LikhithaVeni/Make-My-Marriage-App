import { Card, CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDue, formatRupees } from "@/lib/format";
import type { Dashboard } from "@/modules/dashboard";

interface PendingPaymentsCardProps {
  money: Dashboard["money"];
  /** Today in Asia/Kolkata, for due labels. */
  today: string;
  className?: string;
}

/**
 * Pending expenses, nearest due first, with the total still to pay
 * (PRD: expenses with status Pending and a due date).
 */
export function PendingPaymentsCard({
  money,
  today,
  className,
}: PendingPaymentsCardProps) {
  const payments = money.pendingPayments;

  return (
    <Card
      title="Pending payments"
      className={className}
      aside={
        money.pendingPaise > 0 ? (
          <span className="text-warning">
            {formatRupees(money.pendingPaise)} total
          </span>
        ) : undefined
      }
      footer={
        <CardLink label="View expenses" href="/expenses" available={false} />
      }
    >
      {payments.length === 0 ? (
        <EmptyState
          title="No pending payments"
          description="Expenses marked Pending show here, nearest due first."
        />
      ) : (
        <ul className="divide-y divide-border">
          {payments.map((payment) => {
            const late = payment.dueDate < today;
            return (
              <li
                key={payment.id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-text">
                    {payment.vendorName ?? payment.description}
                  </p>
                  {payment.vendorName && (
                    <p className="text-small text-text-muted">
                      {payment.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium text-text">
                    {formatRupees(payment.amountPaise)}
                  </p>
                  <p
                    className={`text-small ${late ? "text-danger" : "text-text-muted"}`}
                  >
                    {formatDue(payment.dueDate, today)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
