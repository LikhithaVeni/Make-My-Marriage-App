"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { buttonClass } from "@/components/ui/ButtonLink";
import { TextField } from "@/components/ui/TextField";
import { ApiError, postJson } from "@/lib/api-client";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth-rules";

import {
  type AlertMessage,
  authAlert,
  type AuthSession,
  pathAfterAuth,
} from "./auth-client";
import { FormAlert } from "./FormAlert";

const linkProblems: Record<string, AlertMessage> = {
  TOKEN_EXPIRED: {
    title: "This link has expired.",
    body: "Reset links work for 1 hour.",
  },
  TOKEN_USED: {
    title: "This link has already been used.",
    body: "Each link works once, and only the newest one counts.",
  },
  NOT_FOUND: {
    title: "This link isn't valid.",
    body: "Open the newest reset email, or ask for a new one.",
  },
};

/** Chooses a new password from a reset link, then logs in. */
export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [linkBroken, setLinkBroken] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = event.currentTarget.elements.namedItem(
      "password",
    ) as HTMLInputElement;
    // Length here; "not your email" needs the account, so the server checks it.
    const problem = !password
      ? "Choose a password"
      : password.length < PASSWORD_MIN
        ? `Use at least ${PASSWORD_MIN} characters`
        : password.length > PASSWORD_MAX
          ? `Use at most ${PASSWORD_MAX} characters`
          : null;
    setError(problem);
    setAlert(null);
    if (problem) {
      field.focus();
      return;
    }

    setPending(true);
    try {
      const session = await postJson<AuthSession>("/api/v1/auth/reset", {
        token,
        password,
      });
      router.push(pathAfterAuth(session));
      router.refresh();
    } catch (err) {
      setPending(false);
      const code = err instanceof ApiError ? err.code : "";
      if (code === "VALIDATION_FAILED") {
        const fields = (err as ApiError).details?.fields as
          Record<string, string> | undefined;
        setError(fields?.password ?? "Choose a different password");
        field.focus();
        return;
      }
      const linkProblem = linkProblems[code];
      setLinkBroken(Boolean(linkProblem));
      setAlert(linkProblem ?? authAlert(err));
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {alert && (
        <FormAlert title={alert.title}>
          {alert.body}
          {linkBroken && (
            <>
              {" "}
              <Link
                href="/forgot"
                className="font-medium text-accent hover:text-accent-hover"
              >
                Get a new link
              </Link>
            </>
          )}
        </FormAlert>
      )}
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN} characters.`}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
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
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
