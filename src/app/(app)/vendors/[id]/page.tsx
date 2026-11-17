import type { Metadata } from "next";
import Link from "next/link";

import { ExpenseList } from "@/components/expenses/ExpenseList";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DeleteVendorButton } from "@/components/vendors/DeleteVendorButton";
import { formatPhone, formatRupees, todayInKolkata } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/lib/vendor-labels";
import { listExpenses, listExpensesQuerySchema } from "@/modules/expenses";

import { vendorOr404, vendorsContext } from "../vendor-access";

export const metadata: Metadata = {
  title: "Vendor · Make My Marriage",
};

const linkClass =
  "rounded-control font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:gap-6">
      <dt className="shrink-0 text-small text-text-muted sm:w-36">{label}</dt>
      <dd className="min-w-0 wrap-anywhere text-text">{children}</dd>
    </div>
  );
}

/**
 * One vendor (API Design `GET /vendors/{id}`): details, booking status, and
 * paid vs agreed cost from its expenses (PRD "Vendors").
 */
export default async function VendorPage(props: PageProps<"/vendors/[id]">) {
  const ctx = await vendorsContext("vendors.view");
  const vendor = await vendorOr404(ctx, (await props.params).id);
  const { expenses } = await listExpenses(
    ctx,
    listExpensesQuerySchema.parse({ vendorId: vendor.id, limit: 100 }),
  );
  const pendingPaise = expenses
    .filter((expense) => expense.status === "PENDING")
    .reduce((sum, expense) => sum + expense.amountPaise, 0);
  const status = BOOKING_STATUS_LABELS[vendor.bookingStatus]!;
  const left =
    vendor.agreedPaise === null ? null : vendor.agreedPaise - vendor.paidPaise;

  return (
    <>
      <TopBar title="Vendor" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link href="/vendors" className={`self-start text-small ${linkClass}`}>
          ← Vendors
        </Link>

        <Card
          title={vendor.name}
          className="max-w-3xl wrap-anywhere"
          aside={
            <ButtonLink href={`/vendors/${vendor.id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
          }
        >
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="text-text-muted">{vendor.serviceType}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
            {vendor.weddingDayContact && <Badge>Wedding-day contact</Badge>}
          </div>
          <dl className="divide-y divide-border">
            <Row label="Phone">
              {vendor.phone ? (
                <a href={`tel:${vendor.phone}`} className={linkClass}>
                  {formatPhone(vendor.phone)}
                </a>
              ) : (
                <span className="text-text-muted">No phone yet</span>
              )}
            </Row>
            <Row label="Quote">
              {vendor.quotePaise === null ? (
                <span className="text-text-muted">Not recorded</span>
              ) : (
                formatRupees(vendor.quotePaise)
              )}
            </Row>
            <Row label="Agreed cost">
              {vendor.agreedPaise === null ? (
                <span className="text-text-muted">Not agreed yet</span>
              ) : (
                formatRupees(vendor.agreedPaise)
              )}
            </Row>
            {vendor.notes && (
              <Row label="Notes">
                <p className="whitespace-pre-line">{vendor.notes}</p>
              </Row>
            )}
            <Row label="Documents">
              <span className="text-text-muted">
                Quotations and contracts come with file storage.
              </span>
            </Row>
          </dl>
        </Card>

        <Card
          title="Payments"
          className="max-w-3xl"
          footer={
            <div className="py-2">
              <ButtonLink href={`/expenses/new?vendorId=${vendor.id}`}>
                Record payment
              </ButtonLink>
            </div>
          }
        >
          <div className="mb-5 flex flex-col gap-2">
            <p className="text-text">
              <span className="font-display text-heading">
                {formatRupees(vendor.paidPaise)}
              </span>{" "}
              paid
              {vendor.agreedPaise !== null &&
                ` of ${formatRupees(vendor.agreedPaise)} agreed`}
            </p>
            {vendor.agreedPaise !== null && vendor.agreedPaise > 0 && (
              <ProgressBar
                value={Math.min(vendor.paidPaise, vendor.agreedPaise)}
                max={vendor.agreedPaise}
                label="Paid of the agreed cost"
                tone="success"
              />
            )}
            <p className="text-small text-text-muted">
              {left === null
                ? "Add the agreed cost to see what's left to pay."
                : left > 0
                  ? `${formatRupees(left)} left to pay`
                  : left === 0
                    ? "Paid in full"
                    : `${formatRupees(-left)} more than agreed`}
              {pendingPaise > 0 && (
                <span className="text-warning">
                  {" "}
                  · {formatRupees(pendingPaise)} recorded as pending
                </span>
              )}
            </p>
          </div>
          {expenses.length === 0 ? (
            <EmptyState
              title="No payments yet"
              description="Record the advance, then the balance with its due date."
            />
          ) : (
            <ExpenseList expenses={expenses} today={todayInKolkata()} />
          )}
        </Card>

        <div className="max-w-3xl">
          <DeleteVendorButton vendorId={vendor.id} label={vendor.name} />
        </div>
      </main>
    </>
  );
}
