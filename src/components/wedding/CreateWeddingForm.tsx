"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { authAlert, type AlertMessage } from "@/components/auth/auth-client";
import { FormAlert } from "@/components/auth/FormAlert";
import { buttonClass } from "@/components/ui/ButtonLink";
import { TextField } from "@/components/ui/TextField";
import {
  DEFAULT_TAGLINE,
  DescriptionField,
} from "@/components/wedding/DescriptionField";
import { SlugField, useSlugCheck } from "@/components/wedding/SlugField";
import { ApiError, postJson } from "@/lib/api-client";
import { todayInKolkata } from "@/lib/format";
import { slugify } from "@/lib/slug";

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

/** The PRD's wedding setup fields; the cover image arrives with photo storage. */
export function CreateWeddingForm({ siteUrl }: { siteUrl: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({
    brideName: "",
    groomName: "",
    title: "",
    date: "",
    city: "",
    slug: "",
    description: "",
    tagline: "",
  });
  // The title and address follow the names until the user types their own.
  const [edited, setEdited] = useState({ title: false, slug: false });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [pending, setPending] = useState(false);
  const slugCheck = useSlugCheck(values.slug);

  function update(field: Field, value: string) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      const title =
        field === "title" || edited.title
          ? next.title
          : next.groomName && next.brideName
            ? `${next.groomName.trim()} weds ${next.brideName.trim()}`
            : "";
      next.title = title;
      if (field !== "slug" && !edited.slug) next.slug = slugify(title);
      return next;
    });
    if (field === "title" || field === "slug") {
      setEdited((current) => ({ ...current, [field]: true }));
    }
    // The title and address may have changed with it, so their old errors go too.
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(edited.title ? {} : { title: undefined }),
      ...(edited.slug ? {} : { slug: undefined }),
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);
    setPending(true);
    try {
      await postJson("/api/v1/wedding", {
        ...values,
        description: values.description || undefined,
        tagline: values.tagline || undefined,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError && error.code === "VALIDATION_FAILED") {
        const fields = (error.details?.fields ?? {}) as Partial<
          Record<Field, string>
        >;
        setErrors(fields);
        const first = Object.keys(fields)[0];
        if (first) document.getElementsByName(first)[0]?.focus();
        return;
      }
      if (error instanceof ApiError && error.code === "SLUG_TAKEN") {
        slugCheck.markTaken(
          values.slug,
          (error.details?.suggestions as string[]) ?? [],
        );
        setErrors({ slug: "This web address is already taken." });
        return;
      }
      if (error instanceof ApiError && error.code === "ALREADY_IN_WEDDING") {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setAlert(authAlert(error));
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

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {alert && <FormAlert title={alert.title}>{alert.body}</FormAlert>}

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
      />

      <TextField
        label="Invitation tagline (optional)"
        placeholder={DEFAULT_TAGLINE}
        hint="Shown on invitations after the couple's names."
        {...field("tagline")}
      />

      <DescriptionField
        value={values.description}
        onChange={(value) => update("description", value)}
        error={errors.description}
      />

      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass("primary")} mt-2 w-full`}
      >
        {pending ? "Creating your wedding…" : "Create wedding"}
      </button>
    </form>
  );
}
