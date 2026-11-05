import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/LoginForm";
import { cardSurface } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Log in · Make My Marriage" };

const linkClass =
  "rounded-control font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent";

export default function LoginPage() {
  return (
    <>
      <section
        aria-labelledby="login-title"
        className={`p-6 md:p-8 ${cardSurface}`}
      >
        <h1 id="login-title" className="font-display text-title text-text">
          Welcome back
        </h1>
        <p className="mt-1 text-text-muted">Log in to plan with the family.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
      <div className="mt-6 flex flex-col gap-3 text-center text-small text-text-muted">
        <p>
          Invited by your family? Open the link in your invite email to join.
        </p>
        <p>
          New here?{" "}
          <Link href="/signup" className={linkClass}>
            Create your wedding
          </Link>
        </p>
      </div>
    </>
  );
}
