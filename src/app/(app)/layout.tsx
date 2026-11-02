import { Sidebar } from "@/components/layout/Sidebar";

/** Organiser app shell: sidebar on desktop, top bar with a menu on smaller screens. */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
