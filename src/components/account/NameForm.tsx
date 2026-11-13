"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { FormAlert } from "@/components/auth/FormAlert";
import { buttonClass } from "@/components/ui/ButtonLink";
import { TextField } from "@/components/ui/TextField";
import { ApiError, patchJson } from "@/lib/api-client";
import { nameError } from "@/lib/auth-rules";

import { problemMessage } from "@/components/members/problem-message";

/** Change the name family members see (API Design `PATCH /auth/me`). */
export function NameForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = nameError(value);
    setError(found);
    setProblem(null);
    setSaved(false);
    if (found) {
      (
        event.currentTarget.elements.namedItem("name") as HTMLInputElement
      ).focus();
      return;
    }
    setPending(true);
    try {
      await patchJson("/api/v1/auth/me", { name: value.trim() });
      setSaved(true);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_FAILED") {
        setError(
          ((err.details?.fields ?? {}) as Record<string, string>).name ??
            "Check your name",
        );
      } else {
        setProblem(problemMessage(err));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {problem && <FormAlert title={problem} />}
      <TextField
        label="Your name"
        name="name"
        autoComplete="name"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
          setSaved(false);
        }}
        error={error}
        hint="Family members see this name on tasks and in the members list."
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        value={email}
        readOnly
        hint="Your email is how you log in; it can't be changed here."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending || value.trim() === name}
          aria-busy={pending}
          className={buttonClass()}
        >
          {pending ? "Saving…" : "Save name"}
        </button>
        <p role="status" className="text-small text-success">
          {saved && "Saved."}
        </p>
      </div>
    </form>
  );
}
