import Link from "next/link";

import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Sign up and log in share the Stitch login layout: the product's intro on
 * the left, the form on the right. On phones the intro shrinks to a header
 * above the form.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh md:p-6 lg:p-10">
      <div className="mx-auto grid min-h-dvh max-w-6xl grid-rows-[auto_1fr] overflow-hidden md:min-h-[calc(100dvh-3rem)] md:rounded-card md:border md:border-border lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-2 lg:grid-rows-1">
        <aside className="flex flex-col border-b border-border bg-surface px-4 py-5 md:px-12 md:py-10 lg:border-r lg:border-b-0">
          <Link
            href="/"
            className="self-start rounded-control focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Wordmark />
          </Link>
          <div className="my-auto hidden py-12 lg:block">
            <div className="h-px w-10 bg-border" />
            <p className="mt-6 font-display text-title text-text">
              From Haldi to Reception, nothing slips through.
            </p>
            <p className="mt-4 max-w-sm text-text-muted">
              A private workspace where the couple and their families plan the
              wedding together: events, tasks, guests, money and memories.
            </p>
          </div>
          <p className="hidden text-caption text-text-muted lg:block">
            © 2026 Make My Marriage
          </p>
        </aside>
        <main className="flex items-start justify-center px-4 py-8 md:items-center md:px-12">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
