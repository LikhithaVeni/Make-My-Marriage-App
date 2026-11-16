"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { FormAlert } from "@/components/auth/FormAlert";
import { problemMessage } from "@/components/members/problem-message";
import { buttonClass } from "@/components/ui/ButtonLink";
import { TextField } from "@/components/ui/TextField";
import {
  DEFAULT_TAGLINE,
  DescriptionField,
} from "@/components/wedding/DescriptionField";
import { SlugField, useSlugCheck } from "@/components/wedding/SlugField";
import { ApiError, patchJson } from "@/lib/api-client";
import { todayInKolkata } from "@/lib/format";

type Field =
  | "brideName"
  | "groomName"
  | "title"
  | "date"
  | "city"
  | "slug"
  | "description"
  | "tagline";

type Values = Record<Field, string>;

const FIELDS: Field[] = [
  "brideName",
  "groomName",
  "title",
  "date",
  "city",
  "slug",
  "tagline",
  "description",
];

/** The wedding as the API returns it (the fields this form edits). */
export interface EditableWedding {
  brideName: string;
  groomName: string;
  title: string;
  date: string;
  city: string;
  slug: string;
  description: string | null;
  tagline: string;
}

function valuesOf(wedding: EditableWedding): Values {
  return { ...wedding, description: wedding.description ?? "" };
}

/** Only what changed is sent, so another Admin's edits to other fields stay. */
function changesBetween(saved: Values, values: Values) {
  const changes: Partial<Values> = {};
  for (const field of FIELDS) {
    const value = values[field].trim();
    if (value !== saved[field].trim()) changes[field] = value;
  }
  return changes;
}

/** PRD "Wedding setup (Admin only, editable later)"; API `PATCH /wedding`. */
export function WeddingDetailsForm({
  wedding,
  siteUrl,
}: {
  wedding: EditableWedding;
  siteUrl: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<Values>(() => valuesOf(wedding));
  const [values, setValues] = useState<Values>(() => valuesOf(wedding));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const slugCheck = useSlugCheck(values.slug, saved.slug);

  const changes = changesBetween(saved, values);
  const hasChanges = Object.keys(changes).length > 0;

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setDone(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges) return;
    setProblem(null);
    setDone(false);
    setPending(true);
    try {
      const { wedding: updated } = await patchJson<{
        wedding: EditableWedding;
      }>("/api/v1/wedding", changes);
      const next = valuesOf(updated);
      setSaved(next);
      setValues(next);
      setErrors({});
      setDone(true);
      // The sidebar shows the wedding's name and monogram.
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_FAILED") {
        const fields = (error.details?.fields ?? {}) as Partial<
          Record<Field, string>
        >;
        setErrors(fields);
        // A field on the form gets focus; anything else is shown on top.
        const first = FIELDS.find((name) => fields[name]);
        if (first) document.getElementsByName(first)[0]?.focus();
        else setProblem(problemMessage(error));
      } else if (error instanceof ApiError && error.code === "SLUG_TAKEN") {
        slugCheck.markTaken(
          values.slug,
          (error.details?.suggestions as string[]) ?? [],
        );
        setErrors({ slug: "This web address is already taken." });
      } else {
        setProblem(problemMessage(error));
      }
    } finally {
      setPending(false);
    }
  }

  const field = (name: Field) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      update(name, event.target.value),
  });
  const siteHost = siteUrl.replace(/^https?:\/\//, "");
  const slugChanged = values.slug !== saved.slug;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {problem && <FormAlert title={problem} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Bride's name"
          autoComplete="off"
          {...field("brideName")}
        />
        <TextField
          label="Groom's name"
          autoComplete="off"
          {...field("groomName")}
        />
      </div>

      <TextField
        label="Wedding name"
        hint="What family and guests will see, e.g. “KaLi's era” or “Ravi weds Sneha”."
        autoComplete="off"
        {...field("title")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Wedding date"
          type="date"
          min={todayInKolkata()}
          {...field("date")}
        />
        <TextField
          label="City"
          autoComplete="address-level2"
          {...field("city")}
        />
      </div>

      <SlugField
        value={values.slug}
        onChange={(slug) => update("slug", slug)}
        status={slugCheck.status}
        suggestions={slugCheck.suggestions}
        error={errors.slug}
        siteHost={siteHost}
        hint={
          slugChanged
            ? `Your website moves to ${siteHost}/w/${values.slug || "your-address"}. Links to the old address will stop working.`
            : undefined
        }
      />

      <TextField
        label="Invitation tagline (optional)"
        placeholder={DEFAULT_TAGLINE}
        hint="Shown on invitations after the couple's names. Leave it empty for the default."
        {...field("tagline")}
      />

      <DescriptionField
        value={values.description}
        onChange={(value) => update("description", value)}
        error={errors.description}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending || !hasChanges}
          aria-busy={pending}
          className={buttonClass()}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {hasChanges && !pending && (
          <button
            type="button"
            onClick={() => {
              setValues(saved);
              setErrors({});
              setProblem(null);
            }}
            className={buttonClass("secondary")}
          >
            Undo changes
          </button>
        )}
        <p role="status" className="text-small text-success">
          {done && !hasChanges && "Saved."}
        </p>
      </div>
    </form>
  );
}
