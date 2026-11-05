import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/AuthCard";
import { ResetForm } from "@/components/auth/ResetForm";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Choose a new password · Make My Marriage",
};

/** Opened from the reset email: /reset?token=… */
export default async function ResetPage({ searchParams }: PageProps<"/reset">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) {
    return (
      <AuthCard
        title="Choose a new password"
        intro="Open the link in your reset email to choose a new password."
      >
        <ButtonLink href="/forgot" className="w-full">
          Get a reset link
        </ButtonLink>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Choose a new password"
      intro="After saving, you're logged in here and logged out everywhere else."
    >
      <ResetForm token={token} />
    </AuthCard>
  );
}
