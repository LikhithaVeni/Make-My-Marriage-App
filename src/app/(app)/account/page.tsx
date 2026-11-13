import type { Metadata } from "next";

import { NameForm } from "@/components/account/NameForm";
import { PasswordForm } from "@/components/account/PasswordForm";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Your account · Make My Marriage" };

/** The signed-in person's own details (API Design `PATCH /auth/me`). */
export default async function AccountPage() {
  // The app layout already checked the session.
  const session = (await readSession())!;
  const { user } = session.result;

  return (
    <>
      <TopBar title="Your account" />
      <main className="grid flex-1 content-start gap-6 p-4 md:p-8 lg:grid-cols-2">
        <Card title="Your details">
          <NameForm name={user.name} email={user.email} />
        </Card>
        <Card title="Change password">
          <PasswordForm email={user.email} />
        </Card>
      </main>
    </>
  );
}
