"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";

import { FormAlert } from "@/components/auth/FormAlert";
import { problemMessage } from "@/components/members/problem-message";
import { buttonClass } from "@/components/ui/ButtonLink";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { ApiError, patchJson, postJson } from "@/lib/api-client";
import { paiseToInput, parseRupees } from "@/lib/format";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_ORDER,
  SERVICE_TYPES,
} from "@/lib/vendor-labels";
import type { VendorView } from "@/modules/vendors";

type Field =
  | "name"
  | "serviceType"
  | "phone"
  | "bookingStatus"
  | "quotePaise"
  | "agreedPaise"
  | "notes";
type Values = Record<Field, string> & { weddingDayContact: boolean };

/** Form order, for focusing the first field with a problem. */
const FIELDS: Field[] = [
  "name",
  "serviceType",
  "phone",
  "bookingStatus",
  "quotePaise",
  "agreedPaise",
  "notes",
];
const MONEY: Field[] = ["quotePaise", "agreedPaise"];

/** "+919876543210" → "98765 43210" for editing; others as stored. */
function phoneForInput(phone: string | null): string {
  if (!phone) return "";
  const india = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return india ? `${india[1]} ${india[2]}` : phone;
}

function valuesOf(vendor: VendorView): Values {
  return {
    name: vendor.name,
    serviceType: vendor.serviceType,
    phone: phoneForInput(vendor.phone),
    bookingStatus: vendor.bookingStatus,
    quotePaise:
      vendor.quotePaise === null ? "" : paiseToInput(vendor.quotePaise),
    agreedPaise:
      vendor.agreedPaise === null ? "" : paiseToInput(vendor.agreedPaise),
    notes: vendor.notes ?? "",
    weddingDayContact: vendor.weddingDayContact,
  };
}

/** Rupees as typed: "" is no amount; "0" is ₹0; anything else must parse. */
function moneyValue(typed: string): number | null | "invalid" {
  const value = typed.trim();
  if (value === "") return null;
  if (/^0+(\.0+)?$/.test(value)) return 0;
  return parseRupees(value) ?? "invalid";
}

/** Save or edit a vendor (PRD "Vendors", key flow F4, step 2). */
export function VendorForm({ vendor }: { vendor?: VendorView }) {
  const router = useRouter();
  const listId = useId();
  const saved = vendor ? valuesOf(vendor) : null;
  const [values, setValues] = useState<Values>(
    saved ?? {
      name: "",
      serviceType: "",
      phone: "",
      bookingStatus: "QUOTED",
      quotePaise: "",
      agreedPaise: "",
      notes: "",
      weddingDayContact: false,
    },
  );
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const changes: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = values[field].trim();
    if (saved ? value === saved[field].trim() : value === "") continue;
    changes[field] = MONEY.includes(field) ? moneyValue(value) : value;
  }
  if (
    !saved
      ? values.weddingDayContact
      : values.weddingDayContact !== saved.weddingDayContact
  ) {
    changes.weddingDayContact = values.weddingDayContact;
  }
  const hasChanges = !vendor || Object.keys(changes).length > 0;
  const cancelHref = vendor ? `/vendors/${vendor.id}` : "/vendors";

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function onSubmit(submitted: FormEvent<HTMLFormElement>) {
    submitted.preventDefault();
    if (!hasChanges) return;
    setProblem(null);
    const badMoney = MONEY.find((field) => changes[field] === "invalid");
    if (badMoney) {
      setErrors({ [badMoney]: "Enter an amount like 1,20,000" });
      document.getElementsByName(badMoney)[0]?.focus();
      return;
    }
    setPending(true);
    try {
      if (vendor) {
        await patchJson<VendorView>(`/api/v1/vendors/${vendor.id}`, changes);
        router.push(`/vendors/${vendor.id}`);
      } else {
        // Required fields are always sent, so the server names missing ones.
        const created = await postJson<VendorView>("/api/v1/vendors", {
          ...changes,
          name: values.name.trim(),
          serviceType: values.serviceType.trim(),
          bookingStatus: values.bookingStatus,
        });
        router.push(`/vendors/${created.id}`);
      }
      router.refresh();
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError && error.code === "VALIDATION_FAILED") {
        const fields = (error.details?.fields ?? {}) as Partial<
          Record<Field, string>
        >;
        setErrors(fields);
        const first = FIELDS.find((name) => fields[name]);
        if (first) document.getElementsByName(first)[0]?.focus();
        else setProblem(problemMessage(error));
      } else {
        setProblem(problemMessage(error));
      }
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {problem && <FormAlert title={problem} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Vendor name"
          name="name"
          autoComplete="off"
          placeholder="e.g. Bloom Decor"
          value={values.name}
          error={errors.name}
          onChange={(event) => update("name", event.target.value)}
        />
        <TextField
          label="Service"
          name="serviceType"
          list={listId}
          autoComplete="off"
          placeholder="e.g. Catering"
          value={values.serviceType}
          error={errors.serviceType}
          onChange={(event) => update("serviceType", event.target.value)}
        />
      </div>
      <datalist id={listId}>
        {SERVICE_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Phone (optional)"
          name="phone"
          type="text"
          inputMode="tel"
          autoComplete="off"
          placeholder="98765 43210"
          value={values.phone}
          error={errors.phone}
          onChange={(event) => update("phone", event.target.value)}
        />
        <SelectField
          label="Booking status"
          name="bookingStatus"
          value={values.bookingStatus}
          onChange={(value) => update("bookingStatus", value)}
          error={errors.bookingStatus}
          options={BOOKING_STATUS_ORDER.map((status) => ({
            value: status,
            label: BOOKING_STATUS_LABELS[status]!.label,
          }))}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Quote (₹, optional)"
          name="quotePaise"
          inputMode="decimal"
          autoComplete="off"
          placeholder="What they quoted"
          value={values.quotePaise}
          error={errors.quotePaise}
          onChange={(event) => update("quotePaise", event.target.value)}
        />
        <TextField
          label="Agreed cost (₹, optional)"
          name="agreedPaise"
          inputMode="decimal"
          autoComplete="off"
          placeholder="The final price"
          hint="Payments recorded as expenses show against this."
          value={values.agreedPaise}
          error={errors.agreedPaise}
          onChange={(event) => update("agreedPaise", event.target.value)}
        />
      </div>

      <label className="flex min-h-11 items-start gap-3 text-text">
        <input
          type="checkbox"
          name="weddingDayContact"
          checked={values.weddingDayContact}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              weddingDayContact: event.target.checked,
            }))
          }
          className="mt-0.5 size-5 shrink-0 accent-accent"
        />
        <span>
          Wedding-day contact
          <span className="block text-small text-text-muted">
            List them on the dashboard and the contacts page, with a call
            button. Needs a phone number.
          </span>
        </span>
      </label>

      <TextAreaField
        label="Notes (optional)"
        name="notes"
        maxLength={2000}
        value={values.notes}
        onChange={(value) => update("notes", value)}
        error={errors.notes}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending || !hasChanges}
          aria-busy={pending}
          className={buttonClass()}
        >
          {pending ? "Saving…" : vendor ? "Save changes" : "Add vendor"}
        </button>
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
