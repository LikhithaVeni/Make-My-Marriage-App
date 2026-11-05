import Link from "next/link";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { Wordmark } from "@/components/brand/Wordmark";

/** Setting up a wedding: the signed-in user has no app menu yet, only Log out. */
export default function SetupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <Link
            href="/"
            className="rounded-control focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Wordmark />
          </Link>
          <LogoutButton className="min-h-11 px-3 text-small" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
        {children}
      </main>
    </>
  );
}
