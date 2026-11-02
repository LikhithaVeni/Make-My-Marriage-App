import { Monogram } from "@/components/brand/Monogram";
import { NavLinks } from "@/components/layout/NavLinks";

/** Desktop navigation, shown from 768px up. Smaller screens use MobileNav. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface md:flex">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-6">
        <Monogram />
        <span className="font-display font-medium">KaLi&apos;s era</span>
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <NavLinks />
      </div>
    </aside>
  );
}
