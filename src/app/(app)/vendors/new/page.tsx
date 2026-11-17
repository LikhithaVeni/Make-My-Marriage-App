import type { Metadata } from "next";
import Link from "next/link";

import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { VendorForm } from "@/components/vendors/VendorForm";

import { vendorsContext } from "../vendor-access";

export const metadata: Metadata = {
  title: "Add vendor · Make My Marriage",
};

/** PRD key flow F4, step 2: save the chosen vendor. */
export default async function NewVendorPage() {
  await vendorsContext("vendors.create");
  return (
    <>
      <TopBar title="Add vendor" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link
          href="/vendors"
          className="self-start rounded-control text-small font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          ← Vendors
        </Link>
        <Card title="Vendor" className="max-w-3xl">
          <VendorForm />
        </Card>
      </main>
    </>
  );
}
