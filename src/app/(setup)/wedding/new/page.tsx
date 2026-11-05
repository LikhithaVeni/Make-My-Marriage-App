import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateWeddingForm } from "@/components/wedding/CreateWeddingForm";
import { cardSurface } from "@/components/ui/Card";
import { readSession } from "@/lib/session";
import { getPublicEnv } from "@/platform/public-env";

export const metadata: Metadata = {
  title: "Create your wedding · Make My Marriage",
};

/**
 * PRD flow F1, steps 3–4: a verified user without a wedding creates one and
 * becomes its Admin. Anyone else is sent where they belong.
 */
export default async function CreateWeddingPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (!session.context.emailVerified) redirect("/verify");
  if (session.result.wedding) redirect("/dashboard");

  return (
    <section
      aria-labelledby="create-title"
      className={`p-6 md:p-8 ${cardSurface}`}
    >
      <p className="text-caption font-medium tracking-wider text-accent uppercase">
        Step 2 of 3
      </p>
      <h1 id="create-title" className="mt-2 font-display text-title text-text">
        Create your wedding
      </h1>
      <p className="mt-1 text-text-muted">
        Hi {session.result.user.name}. Tell us about the wedding; you can change
        any of this later in Settings.
      </p>
      <div className="mt-8">
        <CreateWeddingForm siteUrl={getPublicEnv().appUrl} />
      </div>
    </section>
  );
}
