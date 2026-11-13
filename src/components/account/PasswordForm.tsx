"use client";

import { type FormEvent, useState } from "react";

import { FormAlert } from "@/components/auth/FormAlert";
import { buttonClass } from "@/components/ui/ButtonLink";
import { TextField } from "@/components/ui/TextField";
import { ApiError, patchJson } from "@/lib/api-client";
import { newPasswordError, PASSWORD_MIN } from "@/lib/auth-rules";

import { problemMessage } from "@/components/members/problem-message";

type Field = "currentPassword" | "newPassword";

/**
 * Change your password with the current one (API Design `PATCH /auth/me`).
 * Other devices are logged out; this one stays logged in.
 */
export function PasswordForm({ email }: { email: string }) {
  const empty = { currentPassword: "", newPassword: "" };
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>(
    {},
  );
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: null }));
    setSaved(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const found = {
      currentPassword: values.currentPassword
        ? null
        : "Enter your current password",
      newPassword: newPasswordError(values.newPassword, email),
    };
    setErrors(found);
    setProblem(null);
    setSaved(false);
    const first = (["currentPassword", "newPassword"] as const).find(
      (field) => found[field],
    );
    if (first) {
      (form.elements.namedItem(first) as HTMLInputElement).focus();
      return;
    }

    setPending(true);
    try {
      await patchJson("/api/v1/auth/me", values);
      setValues(empty);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_FAILED") {
        const fields = (err.details?.fields ?? {}) as Partial<
          Record<Field, string>
        >;
        setErrors(fields);
        const firstBad = (["currentPassword", "newPassword"] as const).find(
          (field) => fields[field],
        );
        if (firstBad) {
          (form.elements.namedItem(firstBad) as HTMLInputElement).focus();
        }
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
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        value={values.currentPassword}
        onChange={(event) => update("currentPassword", event.target.value)}
        error={errors.currentPassword}
      />
      <TextField
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        value={values.newPassword}
        onChange={(event) => update("newPassword", event.target.value)}
        error={errors.newPassword}
        hint={`At least ${PASSWORD_MIN} characters.`}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={buttonClass()}
        >
          {pending ? "Saving…" : "Change password"}
        </button>
        <p role="status" className="text-small text-success">
          {saved &&
            "Password changed. Your other devices have been logged out."}
        </p>
      </div>
    </form>
  );
}
