import Link from "next/link";

import { Monogram } from "@/components/brand/Monogram";

const buttonClass =
  "inline-flex h-11 items-center justify-center rounded-control px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <Monogram size="lg" />
      <h1 className="mt-6 font-display text-title md:text-display">
        KaLi&apos;s era
      </h1>
      <p className="mt-3 max-w-md text-text-muted">
        From Haldi to Reception, nothing slips through.
      </p>
      <div className="mt-10 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Link
          href="/login"
          className={`${buttonClass} bg-accent text-surface hover:bg-accent-hover`}
        >
          Log in
        </Link>
        <Link
          href="/dashboard"
          className={`${buttonClass} border border-accent bg-surface text-accent hover:bg-accent-tint`}
        >
          Open dashboard
        </Link>
      </div>
    </main>
  );
}
