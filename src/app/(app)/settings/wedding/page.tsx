import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { WeddingDetailsForm } from "@/components/wedding/WeddingDetailsForm";
import { readSession } from "@/lib/session";
import { getWedding, weddingPolicy } from "@/modules/wedding";
import { getPublicEnv } from "@/platform/public-env";
import { authorize } from "@/platform/rbac";

export const metadata: Metadata = {
  title: "Wedding details · Make My Marriage",
};

/** PRD "Wedding setup (Admin only, editable later)". */
export default async function WeddingDetailsPage() {
  // The app layout already checked the session; Settings is Admin only.
  const session = await readSession();
  if (session?.result.role !== "ADMIN") redirect("/dashboard");
  const ctx = authorize(session.context, weddingPolicy, "wedding.update");
  const wedding = await getWedding(ctx);

  return (
    <>
      <TopBar title="Wedding details" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link
          href="/settings"
          className="self-start rounded-control text-small font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          ← Settings
        </Link>

        <Card title="What family and guests see" className="max-w-3xl">
          <p className="mb-5 text-text-muted">
            These show on the dashboard, the wedding website and invitations.
            Only Admins can change them. The cover image arrives with photo
            uploads.
          </p>
          <WeddingDetailsForm
            wedding={wedding}
            siteUrl={getPublicEnv().appUrl}
          />
        </Card>
      </main>
    </>
  );
}
