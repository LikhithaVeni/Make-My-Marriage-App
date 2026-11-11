import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { LoginForm } from "@/components/auth/LoginForm";
import { pathAfterAuth } from "@/components/auth/auth-client";
import { cardSurface } from "@/components/ui/Card";
import { readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Log in · Make My Marriage" };

const linkClass =
  "rounded-control font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : null;
  // Already logged in: go on to where they belong.
  const session = await readSession();
  if (session) redirect(pathAfterAuth(session.result, nextPath));

  return (
    <>
      <AuthShowcase variant="login" />
      <main className="mx-auto w-full max-w-md lg:mr-0">
        <section
          aria-labelledby="login-title"
          className={`p-6 md:p-8 ${cardSurface}`}
        >
          <h1 id="login-title" className="font-display text-title text-text">
            Welcome back
          </h1>
          <p className="mt-1 text-text-muted">
            Log in to plan with the family.
          </p>
          <div className="mt-6">
            <LoginForm next={nextPath} />
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
      </main>
    </>
  );
}
