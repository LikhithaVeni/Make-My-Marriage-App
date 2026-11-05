"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { buttonClass } from "@/components/ui/ButtonLink";
import { TextField } from "@/components/ui/TextField";
import { postJson } from "@/lib/api-client";
import { emailError, passwordEnteredError } from "@/lib/auth-rules";

import {
  type AlertMessage,
  authAlert,
  type AuthSession,
  pathAfterAuth,
} from "./auth-client";
import { FormAlert } from "./FormAlert";

type Field = "email" | "password";

/** Email and password log in (PRD, "Signup and login"). */
export function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>(
    {},
  );
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [pending, setPending] = useState(false);

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear a field's error as soon as it is edited.
    setErrors((current) => ({ ...current, [field]: null }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const found = {
      email: emailError(values.email),
      password: passwordEnteredError(values.password),
    };
    setErrors(found);
    setAlert(null);
    const firstInvalid = (["email", "password"] as const).find(
      (field) => found[field],
    );
    if (firstInvalid) {
      (form.elements.namedItem(firstInvalid) as HTMLInputElement).focus();
      return;
    }

    setPending(true);
    try {
      const session = await postJson<AuthSession>("/api/v1/auth/login", {
        email: values.email.trim(),
        password: values.password,
      });
      router.push(pathAfterAuth(session));
    } catch (error) {
      setAlert(authAlert(error));
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {alert && <FormAlert title={alert.title}>{alert.body}</FormAlert>}
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
        autoComplete="current-password"
        value={values.password}
        onChange={(event) => update("password", event.target.value)}
        error={errors.password}
        labelAside={
          // Forgot password needs email, so it arrives with Resend (auth step F).
          <span className="text-small text-text-muted">
            Forgot password? <span className="text-caption">Soon</span>
          </span>
        }
      />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={`${buttonClass()} mt-1 w-full`}
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
