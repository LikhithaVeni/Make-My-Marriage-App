import { CardLink } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { formatRupeesShort } from "@/lib/format";
import type { Dashboard } from "@/modules/dashboard";

interface TotalsRowProps {
  totals: Dashboard["totals"];
  money: Dashboard["money"];
}

interface Tile {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  link: { label: string; href: string };
}

/**
 * The PRD's Totals card as a row of tiles: events, vendors, guests and money
 * spent. Guests wait for Phase 2 (docs/decisions.md, decision 38).
 */
export function TotalsRow({ totals, money }: TotalsRowProps) {
  const tiles: Tile[] = [
    {
      label: "Events",
      value: totals.events,
      link: { label: "View events", href: "/events" },
    },
    {
      label: "Vendors",
      value: totals.vendors,
      link: { label: "Manage vendors", href: "/vendors" },
    },
    {
      label: "Guests",
      value: <span className="text-text-muted">—</span>,
      detail: "Comes with the guest list",
      link: { label: "Guest list", href: "/guests" },
    },
    {
      label: "Spent",
      value: formatRupeesShort(money.spentPaise),
      detail:
        money.pendingPaise > 0 ? (
          <span className="text-warning">
            {formatRupeesShort(money.pendingPaise)} pending
          </span>
        ) : (
          "Nothing pending"
        ),
      link: { label: "View expenses", href: "/expenses" },
    },
  ];

  return (
    <section aria-label="Totals">
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {tiles.map((tile) => (
          <li
            key={tile.label}
            className="flex flex-col rounded-card border border-border bg-surface p-4 md:p-6"
          >
            <div className="flex-1">
              <Stat
                label={tile.label}
                value={tile.value}
                detail={tile.detail}
              />
            </div>
            <div className="mt-4 border-t border-border pt-1">
              <CardLink
                label={tile.link.label}
                href={tile.link.href}
                available={false}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
