import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/layout/TopBar";
import { Card, CardLink } from "@/components/ui/Card";
import { readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Settings · Make My Marriage" };

// The Settings screens from the PRD's Screens table (Admin only).
const sections = [
  {
    title: "Wedding members",
    text: "Invite family as Admins or Managers, change roles, remove members.",
    href: "/settings/members",
    available: true,
  },
  {
    title: "Wedding details",
    text: "Names, date, city, cover image, description and tagline.",
    href: "/settings/wedding",
    available: false,
  },
  {
    title: "Photographer access",
    text: "A login for your photographer to upload professional photos.",
    href: "/settings/photographer",
    available: false,
  },
  {
    title: "Professional album password",
    text: "The password guests use to see the professional photos.",
    href: "/settings/album-password",
    available: false,
  },
];

export default async function SettingsPage() {
  // The app layout already checked the session; Settings is Admin only.
  const session = await readSession();
  if (session?.result.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <TopBar title="Settings" />
      <main className="grid flex-1 content-start gap-6 p-4 md:grid-cols-2 md:p-8">
        {sections.map((section) => (
          <Card
            key={section.title}
            title={section.title}
            footer={
              <CardLink
                label={section.available ? "Open" : section.title}
                href={section.href}
                available={section.available}
              />
            }
          >
            <p className="text-text-muted">{section.text}</p>
          </Card>
        ))}
      </main>
    </>
  );
}
