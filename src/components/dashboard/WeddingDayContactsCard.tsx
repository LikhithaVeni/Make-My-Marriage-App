import { Card, CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPhone } from "@/lib/format";
import type { Dashboard } from "@/modules/dashboard";

interface WeddingDayContactsCardProps {
  contacts: Dashboard["weddingDayContacts"];
  className?: string;
}

/**
 * Who to call on the day: organisers and vendors flagged as wedding-day
 * contacts, with tap-to-call links (PRD, "Wedding-day contacts").
 */
export function WeddingDayContactsCard({
  contacts,
  className,
}: WeddingDayContactsCardProps) {
  return (
    <Card
      title="Wedding-day contacts"
      className={className}
      footer={
        <CardLink
          label="View all contacts"
          href="/vendors/contacts"
          available={false}
        />
      }
    >
      {contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Mark vendors as wedding-day contacts to list them here."
        />
      ) : (
        <ul className="divide-y divide-border">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className="flex items-center justify-between gap-4 py-2"
            >
              <div className="min-w-0">
                <p className="font-medium text-text">{contact.name}</p>
                <p className="text-small text-text-muted">
                  {contact.role} · {formatPhone(contact.phone)}
                </p>
              </div>
              <a
                href={`tel:${contact.phone}`}
                aria-label={`Call ${contact.name}`}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-accent hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
