import type { Metadata } from "next";
import Link from "next/link";

import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink, buttonClass } from "@/components/ui/ButtonLink";
import { Card, cardSurface } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FindNearby } from "@/components/vendors/FindNearby";
import { formatPhone, formatRupees } from "@/lib/format";
import { toSearchParams } from "@/lib/search-params";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_ORDER,
} from "@/lib/vendor-labels";
import { listEvents } from "@/modules/events";
import { paidByVendor } from "@/modules/expenses";
import {
  listVendors,
  listVendorsQuerySchema,
  parseVendorQuery,
  type VendorView,
} from "@/modules/vendors";

import { vendorsContext } from "./vendor-access";

export const metadata: Metadata = {
  title: "Vendors · Make My Marriage",
};

const fieldClass =
  "mt-1.5 h-11 w-full rounded-control border border-border bg-surface px-3 text-body text-text focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent";
const labelClass = "text-small font-medium text-text";

/** Vendors grouped by service, in the list's order. */
function byService(vendors: VendorView[]): [string, VendorView[]][] {
  const groups = new Map<string, VendorView[]>();
  for (const vendor of vendors) {
    groups.set(vendor.serviceType, [
      ...(groups.get(vendor.serviceType) ?? []),
      vendor,
    ]);
  }
  return [...groups.entries()];
}

/**
 * PRD "Vendors": every vendor by service with booking status, phone and
 * paid vs agreed cost; Find nearby; filters (API Design `GET /vendors`).
 */
export default async function VendorsPage(props: PageProps<"/vendors">) {
  const ctx = await vendorsContext("vendors.list");
  const search = toSearchParams(await props.searchParams);
  const parsed = parseVendorQuery(search);
  const query = parsed.success ? parsed.data : listVendorsQuerySchema.parse({});
  const paid = await paidByVendor(ctx);
  const [vendors, all, events] = await Promise.all([
    listVendors(ctx, query, paid),
    listVendors(ctx, {}, paid),
    listEvents(ctx),
  ]);
  const filtered = [...search.keys()].length > 0;
  const services = [...new Set(all.map((vendor) => vendor.serviceType))];

  return (
    <>
      <TopBar title="Vendors" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/vendors/contacts"
            className="rounded-control text-small font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
          >
            Wedding-day contacts →
          </Link>
          <ButtonLink href="/vendors/new">Add vendor</ButtonLink>
        </div>

        <Card title="Find nearby">
          <p className="mb-4 text-small text-text-muted">
            Search Google Maps for a service near an event&apos;s venue, then
            save the one you choose here.
          </p>
          <FindNearby
            events={events.map((event) => ({
              id: event.id,
              name: event.name,
              venue: { name: event.venue.name, address: event.venue.address },
            }))}
          />
        </Card>

        {all.length === 0 ? (
          <section className={`p-6 ${cardSurface}`}>
            <EmptyState
              title="No vendors yet"
              description="Save caterers, decorators, photographers and the rest with their quote, agreed cost and booking status."
            >
              <ButtonLink href="/vendors/new">Add vendor</ButtonLink>
            </EmptyState>
          </section>
        ) : (
          <>
            <details className={`p-4 ${cardSurface}`} open={filtered}>
              <summary className="min-h-11 cursor-pointer content-center rounded-control font-medium text-accent focus-visible:outline-2 focus-visible:outline-accent">
                Filter
              </summary>
              <form
                action="/vendors"
                className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <div>
                  <label htmlFor="filter-q" className={labelClass}>
                    Search name or phone
                  </label>
                  <input
                    id="filter-q"
                    name="q"
                    type="search"
                    defaultValue={query.q ?? ""}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="filter-service" className={labelClass}>
                    Service
                  </label>
                  <select
                    id="filter-service"
                    name="serviceType"
                    defaultValue={query.serviceType ?? ""}
                    className={fieldClass}
                  >
                    <option value="">Any service</option>
                    {services.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="filter-status" className={labelClass}>
                    Booking status
                  </label>
                  <select
                    id="filter-status"
                    name="bookingStatus"
                    defaultValue={query.bookingStatus ?? ""}
                    className={fieldClass}
                  >
                    <option value="">Any status</option>
                    {BOOKING_STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {BOOKING_STATUS_LABELS[status]!.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
                  <button type="submit" className={buttonClass()}>
                    Apply
                  </button>
                  <Link href="/vendors" className={buttonClass("secondary")}>
                    Clear
                  </Link>
                </div>
              </form>
            </details>

            {vendors.length === 0 ? (
              <section className={`p-6 ${cardSurface}`}>
                <EmptyState
                  title="No vendors match"
                  description="Try other filters, or clear them."
                />
              </section>
            ) : (
              byService(vendors).map(([service, group]) => (
                <Card key={service} title={service} aside={`${group.length}`}>
                  <ul className="divide-y divide-border">
                    {group.map((vendor) => {
                      const status =
                        BOOKING_STATUS_LABELS[vendor.bookingStatus]!;
                      return (
                        <li
                          key={vendor.id}
                          className="py-1 first:pt-0 last:pb-0"
                        >
                          <Link
                            href={`/vendors/${vendor.id}`}
                            className="-mx-3 flex items-start justify-between gap-4 rounded-control px-3 py-2 hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent"
                          >
                            <span className="min-w-0 wrap-anywhere">
                              <span className="block font-medium text-text">
                                {vendor.name}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-small text-text-muted">
                                {vendor.phone && (
                                  <span>{formatPhone(vendor.phone)}</span>
                                )}
                                {vendor.agreedPaise !== null ? (
                                  <span>
                                    {formatRupees(vendor.paidPaise)} paid of{" "}
                                    {formatRupees(vendor.agreedPaise)}
                                  </span>
                                ) : vendor.quotePaise !== null ? (
                                  <span>
                                    Quoted {formatRupees(vendor.quotePaise)}
                                  </span>
                                ) : null}
                                {vendor.weddingDayContact && (
                                  <span>Wedding-day contact</span>
                                )}
                              </span>
                            </span>
                            <Badge tone={status.tone}>{status.label}</Badge>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ))
            )}
          </>
        )}
      </main>
    </>
  );
}
