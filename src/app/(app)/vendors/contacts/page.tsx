import type { Metadata } from "next";
import Link from "next/link";

import { TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardSurface } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPhone } from "@/lib/format";
import { weddingDayContacts } from "@/modules/vendors";

import { vendorsContext } from "../vendor-access";

export const metadata: Metadata = {
  title: "Wedding-day contacts · Make My Marriage",
};

/**
 * PRD "Wedding-day contacts": one page of who to call on the day, with
 * tap-to-call numbers (API Design `GET /vendors/contacts`).
 */
export default async function ContactsPage() {
  const ctx = await vendorsContext("vendors.list");
  const contacts = await weddingDayContacts(ctx);

  return (
    <>
      <TopBar title="Wedding-day contacts" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link
          href="/vendors"
          className="self-start rounded-control text-small font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          ← Vendors
        </Link>
        <section
          className={`max-w-3xl p-6 ${cardSurface}`}
          aria-label="Contacts"
        >
          {contacts.length === 0 ? (
            <EmptyState
              title="No wedding-day contacts yet"
              description="Tick “Wedding-day contact” on a vendor with a phone number to list them here."
            >
              <ButtonLink href="/vendors">Go to vendors</ButtonLink>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {contacts.map((contact) => (
                <li
                  key={contact.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <Link
                    href={`/vendors/${contact.id}`}
                    className="min-w-0 rounded-control wrap-anywhere focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span className="block font-medium text-text">
                      {contact.name}
                    </span>
                    <span className="block text-small text-text-muted">
                      {contact.role} · {formatPhone(contact.phone)}
                    </span>
                  </Link>
                  <a
                    href={`tel:${contact.phone}`}
                    aria-label={`Call ${contact.name}`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control border border-accent px-4 font-medium text-accent hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    Call
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
