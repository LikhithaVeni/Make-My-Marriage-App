"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { buttonClass } from "@/components/ui/ButtonLink";
import { TextField } from "@/components/ui/TextField";
import { ApiError, postJson } from "@/lib/api-client";
import {
  emailError,
  nameError,
  newPasswordError,
  PASSWORD_MIN,
} from "@/lib/auth-rules";

import {
  type AlertMessage,
  authAlert,
  type AuthSession,
  pathAfterAuth,
} from "./auth-client";
import { FormAlert } from "./FormAlert";

type Field = "name" | "email" | "password";
const fields: Field[] = ["name", "email", "password"];

/** Create an account to start a new wedding (PRD flow F1, step 1). */
export function SignupForm() {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>(
    {},
  );
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [pending, setPending] = useState(false);

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: null }));
    if (field === "email") setEmailTaken(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const found = {
      name: nameError(values.name),
      email: emailError(values.email),
      password: newPasswordError(values.password, values.email),
    };
    setErrors(found);
    setAlert(null);
    setEmailTaken(false);
    const firstInvalid = fields.find((field) => found[field]);
    if (firstInvalid) {
      (form.elements.namedItem(firstInvalid) as HTMLInputElement).focus();
      return;
    }

    setPending(true);
    try {
      const session = await postJson<AuthSession>("/api/v1/auth/signup", {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      router.push(pathAfterAuth(session));
    } catch (error) {
      // PRD F1: an email that's already registered → "Log in instead".
      if (error instanceof ApiError && error.code === "EMAIL_TAKEN") {
        setEmailTaken(true);
        setErrors((current) => ({
          ...current,
          email: "An account with this email already exists",
        }));
        (form.elements.namedItem("email") as HTMLInputElement).focus();
      } else {
        setAlert(authAlert(error));
      }
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {alert && <FormAlert title={alert.title}>{alert.body}</FormAlert>}
      {emailTaken && (
        <FormAlert title="This email already has an account.">
          <Link
            href="/login"
            className="font-medium text-accent hover:text-accent-hover"
          >
            Log in instead
          </Link>
        </FormAlert>
      )}
      <TextField
        label="Your name"
        name="name"
        autoComplete="name"
        value={values.name}
        onChange={(event) => update("name", event.target.value)}
        error={errors.name}
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={values.email}
        onChange={(event) => update("email", event.target.value)}
        error={errors.email}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={values.password}
        onChange={(event) => update("password", event.target.value)}
        error={errors.password}
        hint={`At least ${PASSWORD_MIN} characters.`}
      />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={`${buttonClass()} mt-1 w-full`}
      >
        {pending ? "Creating your account…" : "Create account"}
      </button>
    </form>
  );
}
