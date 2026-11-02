import Link from "next/link";

import { Monogram } from "@/components/brand/Monogram";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <section className="w-full max-w-sm rounded-card border border-border bg-surface p-8 text-center">
        <div className="flex justify-center">
          <Monogram />
        </div>
        <h1 className="mt-4 font-display text-heading">Log in</h1>
        <p className="mt-2 text-small text-text-muted">
          Logging in is coming soon.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-control text-small font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}
