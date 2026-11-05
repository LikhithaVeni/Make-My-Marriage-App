"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import { buttonClass } from "@/components/ui/ButtonLink";
import { TextField } from "@/components/ui/TextField";
import { postJson } from "@/lib/api-client";
import { emailError } from "@/lib/auth-rules";

import { type AlertMessage, authAlert } from "./auth-client";
import { FormAlert } from "./FormAlert";

const linkClass =
  "rounded-control font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent";

/** Asks for a reset link (API Design: the answer is the same for any email). */
export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = emailError(email);
    setError(problem);
    setAlert(null);
    if (problem) {
      (
        event.currentTarget.elements.namedItem("email") as HTMLInputElement
      ).focus();
      return;
    }
    setPending(true);
    try {
      await postJson("/api/v1/auth/forgot", { email: email.trim() });
      setSentTo(email.trim());
    } catch (err) {
      setAlert(authAlert(err));
    } finally {
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div role="status">
        <p className="text-text">
          If an account exists for <span className="font-medium">{sentTo}</span>
          , we&apos;ve sent it a link to choose a new password.
        </p>
        <p className="mt-2 text-small text-text-muted">
          The link works for 1 hour. Can&apos;t find it? Check spam, or{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className={linkClass}
          >
            send another
          </button>
          .
        </p>
        <Link
          href="/login"
          className={`${buttonClass("secondary")} mt-6 w-full`}
        >
          Back to log in
        </Link>
      </div>
    );
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
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setError(null);
        }}
        error={error}
      />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={`${buttonClass()} w-full`}
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-small text-text-muted">
        Remembered it?{" "}
        <Link href="/login" className={linkClass}>
          Log in
        </Link>
      </p>
    </form>
  );
}
