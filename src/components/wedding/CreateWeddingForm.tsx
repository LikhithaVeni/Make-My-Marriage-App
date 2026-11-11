"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { authAlert, type AlertMessage } from "@/components/auth/auth-client";
import { FormAlert } from "@/components/auth/FormAlert";
import { buttonClass } from "@/components/ui/ButtonLink";
import { TextField } from "@/components/ui/TextField";
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

/** The server's answer for one address. */
interface SlugCheck {
  slug: string;
  available: boolean;
  suggestions: string[];
}

const SLUG_SHAPE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const DEFAULT_TAGLINE = "invite you to celebrate with us";

const textareaClass =
  "w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-body text-text placeholder:text-text-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent";

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
  const [slugCheck, setSlugCheck] = useState<SlugCheck | null>(null);
  const [pending, setPending] = useState(false);

  function update(field: Field, raw: string) {
    // Addresses are lowercase letters, numbers and hyphens only.
    const value =
      field === "slug" ? raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-") : raw;
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

  // Check the address shortly after typing stops. Until the answer for the
  // current address arrives, it shows as "Checking…".
  const { slug } = values;
  const slugStatus = !SLUG_SHAPE.test(slug)
    ? "idle"
    : slugCheck?.slug !== slug
      ? "checking"
      : slugCheck.available
        ? "available"
        : "taken";
  const suggestions = slugStatus === "taken" ? slugCheck!.suggestions : [];
  useEffect(() => {
    if (!SLUG_SHAPE.test(slug)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/v1/wedding/slug-available?slug=${encodeURIComponent(slug)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as { data?: SlugCheck };
        if (payload.data) setSlugCheck(payload.data);
      } catch {
        // Aborted or offline: saving checks the address again anyway.
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

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
        setSlugCheck({
          slug: values.slug,
          available: false,
          suggestions: (error.details?.suggestions as string[]) ?? [],
        });
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

      <div>
        <TextField
          label="Website address"
          hint={`Your wedding website will be at ${siteHost}/w/${values.slug || "your-address"}`}
          autoComplete="off"
          spellCheck={false}
          {...field("slug")}
        />
        <p role="status" className="mt-1.5 min-h-5 text-small">
          {slugStatus === "checking" && (
            <span className="text-text-muted">Checking…</span>
          )}
          {slugStatus === "available" && !errors.slug && (
            <span className="text-success">This address is free.</span>
          )}
          {slugStatus === "taken" && !errors.slug && (
            <span className="text-danger">This address is taken.</span>
          )}
        </p>
        {suggestions.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-small">
            <span className="text-text-muted">Try:</span>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => update("slug", suggestion)}
                className="min-h-9 rounded-full border border-border bg-bg px-3 text-text hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <TextField
        label="Invitation tagline (optional)"
        placeholder={DEFAULT_TAGLINE}
        hint="Shown on invitations after the couple's names."
        {...field("tagline")}
      />

      <div>
        <label
          htmlFor="wedding-description"
          className="text-small font-medium text-text"
        >
          About the wedding (optional)
        </label>
        <textarea
          id="wedding-description"
          name="description"
          rows={3}
          maxLength={2000}
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          aria-invalid={errors.description ? true : undefined}
          className={`mt-1.5 ${textareaClass}`}
        />
        {errors.description && (
          <p className="mt-1.5 text-small text-danger">{errors.description}</p>
        )}
      </div>

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
