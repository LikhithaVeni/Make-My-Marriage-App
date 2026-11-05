import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata: Metadata = {
  title: "Forgot password · Make My Marriage",
};

export default function ForgotPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      intro="Enter your email and we'll send you a link to choose a new one."
    >
      <ForgotForm />
    </AuthCard>
  );
}
