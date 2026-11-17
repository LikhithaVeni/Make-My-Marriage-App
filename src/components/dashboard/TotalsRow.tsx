import { CardLink, cardSurface } from "@/components/ui/Card";
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
  link: { label: string; href: string; available: boolean };
}

const notYet = <span className="text-text-muted">—</span>;

/**
 * The PRD's Totals card as a row of tiles: events, vendors, guests and money
 * spent. A tile whose feature isn't built yet says what it comes with
 * (decisions 38 and 73).
 */
export function TotalsRow({ totals, money }: TotalsRowProps) {
  const tiles: Tile[] = [
    {
      label: "Events",
      value: totals.events,
      link: { label: "View events", href: "/events", available: true },
    },
    {
      label: "Vendors",
      value: totals.vendors ?? notYet,
      detail: totals.vendors === null ? "Comes with vendors" : undefined,
      link: {
        label: "Manage vendors",
        href: "/vendors",
        available: totals.vendors !== null,
      },
    },
    {
      label: "Guests",
      value: totals.households ?? notYet,
      detail:
        totals.households === null
          ? "Comes with the guest list"
          : `${totals.people ?? 0} people`,
      link: {
        label: "Guest list",
        href: "/guests",
        available: totals.households !== null,
      },
    },
    {
      label: "Spent",
      value: money ? formatRupeesShort(money.spentPaise) : notYet,
      detail: !money ? (
        "Comes with expenses"
      ) : money.pendingPaise > 0 ? (
        <span className="text-warning">
          {formatRupeesShort(money.pendingPaise)} pending
        </span>
      ) : (
        "Nothing pending"
      ),
      link: {
        label: "View expenses",
        href: "/expenses",
        available: money !== null,
      },
    },
  ];

  return (
    <section aria-label="Totals">
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {tiles.map((tile) => (
          <li
            key={tile.label}
            className={`flex flex-col p-4 md:p-6 ${cardSurface}`}
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
                available={tile.link.available}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
