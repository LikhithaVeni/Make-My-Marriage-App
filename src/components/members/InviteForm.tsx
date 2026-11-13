"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { FormAlert } from "@/components/auth/FormAlert";
import { buttonClass } from "@/components/ui/ButtonLink";
import { TextField } from "@/components/ui/TextField";
import { ApiError, postJson } from "@/lib/api-client";
import { emailError, nameError } from "@/lib/auth-rules";

import { problemMessage } from "./problem-message";

type Field = "name" | "email" | "relationLabel";

const selectClass =
  "h-11 w-full rounded-control border border-border bg-surface px-3 text-body text-text focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent";

/** Invite a family member by email as Admin or Manager (PRD F2, step 1). */
export function InviteForm() {
  const router = useRouter();
  const empty = { name: "", email: "", relationLabel: "" };
  const [values, setValues] = useState(empty);
  const [role, setRole] = useState<"MANAGER" | "ADMIN">("MANAGER");
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>(
    {},
  );
  const [problem, setProblem] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: null }));
    setSentTo(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const found = {
      name: nameError(values.name),
      email: emailError(values.email),
    };
    setErrors(found);
    setProblem(null);
    const first = (["name", "email"] as const).find((field) => found[field]);
    if (first) {
      (form.elements.namedItem(first) as HTMLInputElement).focus();
      return;
    }

    setPending(true);
    try {
      await postJson("/api/v1/invites", {
        name: values.name.trim(),
        email: values.email.trim(),
        role,
        relationLabel: values.relationLabel.trim() || undefined,
      });
      setSentTo(values.email.trim());
      setValues(empty);
      setRole("MANAGER");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_FAILED") {
        setErrors(
          (error.details?.fields ?? {}) as Partial<Record<Field, string>>,
        );
      } else {
        setProblem(problemMessage(error));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {problem && <FormAlert title={problem} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Name"
          name="name"
          autoComplete="off"
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          error={errors.name}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          placeholder="name@example.com"
          value={values.email}
          onChange={(event) => update("email", event.target.value)}
          error={errors.email}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="invite-role"
            className="text-small font-medium text-text"
          >
            Role
          </label>
          <select
            id="invite-role"
            name="role"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "MANAGER" | "ADMIN")
            }
            className={`mt-1.5 ${selectClass}`}
          >
            <option value="MANAGER">Manager: plans day to day</option>
            <option value="ADMIN">Admin: can do everything</option>
          </select>
        </div>
        <TextField
          label="Relation (optional)"
          name="relationLabel"
          autoComplete="off"
          placeholder="Bride's mother"
          value={values.relationLabel}
          onChange={(event) => update("relationLabel", event.target.value)}
          error={errors.relationLabel}
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={buttonClass()}
        >
          {pending ? "Sending invite…" : "Send invite"}
        </button>
        <p
          role="status"
          className="flex items-center gap-2 text-small text-success"
        >
          {sentTo && (
            <>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 shrink-0"
              >
                <path d="m5 12 5 5 9-10" />
              </svg>
              {`Invite sent to ${sentTo}. The link works for 7 days.`}
            </>
          )}
        </p>
      </div>
    </form>
  );
}
