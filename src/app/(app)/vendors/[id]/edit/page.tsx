import type { Metadata } from "next";
import Link from "next/link";

import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { VendorForm } from "@/components/vendors/VendorForm";

import { vendorOr404, vendorsContext } from "../../vendor-access";

export const metadata: Metadata = {
  title: "Edit vendor · Make My Marriage",
};

/** Edit a vendor or move its booking status (API Design `PATCH /vendors/{id}`). */
export default async function EditVendorPage(
  props: PageProps<"/vendors/[id]/edit">,
) {
  const ctx = await vendorsContext("vendors.update");
  const vendor = await vendorOr404(ctx, (await props.params).id);
  return (
    <>
      <TopBar title="Edit vendor" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link
          href={`/vendors/${vendor.id}`}
          className="self-start rounded-control text-small font-medium wrap-anywhere text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          ← {vendor.name}
        </Link>
        <Card title="Vendor" className="max-w-3xl">
          <VendorForm vendor={vendor} />
        </Card>
      </main>
    </>
  );
}
