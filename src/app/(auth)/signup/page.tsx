import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/components/auth/SignupForm";
import { cardSurface } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Sign up · Make My Marriage" };

const linkClass =
  "rounded-control font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent";

export default function SignupPage() {
  return (
    <>
      <section
        aria-labelledby="signup-title"
        className={`p-6 md:p-8 ${cardSurface}`}
      >
        <h1 id="signup-title" className="font-display text-title text-text">
          Create your account
        </h1>
        <p className="mt-1 text-text-muted">
          Start here, then set up your wedding and invite the family.
        </p>
        <div className="mt-6">
          <SignupForm />
        </div>
      </section>
      <div className="mt-6 flex flex-col gap-3 text-center text-small text-text-muted">
        <p>
          Invited by your family? Use the link in your invite email instead, so
          you join their wedding.
        </p>
        <p>
          Already have an account?{" "}
          <Link href="/login" className={linkClass}>
            Log in
          </Link>
        </p>
      </div>
    </>
  );
}
