import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { WeddingBrandProvider } from "@/components/layout/wedding-brand";
import { readSession } from "@/lib/session";

/**
 * Organiser app shell: sidebar on desktop, top bar with a menu on smaller
 * screens, headed by the signed-in wedding. Only members of a wedding get in
 * (PRD F1): logged out → log in, unverified → verify, no wedding → create
 * one. proxy.ts already turned away requests without a session cookie.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (!session.context.emailVerified) redirect("/verify");
  const { wedding, user, role } = session.result;
  if (!wedding) redirect("/wedding/new");

  const brand = {
    title: wedding.title,
    monogram: wedding.monogram,
    userName: user.name,
    role: role ?? "MANAGER",
  };
  return (
    <WeddingBrandProvider brand={brand}>
      <div className="flex min-h-dvh">
        <Sidebar brand={brand} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </WeddingBrandProvider>
  );
}
