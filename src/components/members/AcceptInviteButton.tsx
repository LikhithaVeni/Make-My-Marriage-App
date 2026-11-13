"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormAlert } from "@/components/auth/FormAlert";
import { buttonClass } from "@/components/ui/ButtonLink";
import { postJson } from "@/lib/api-client";

import { problemMessage } from "./problem-message";

/** Joins the wedding for a signed-in visitor with the invited email. */
export function AcceptInviteButton({
  token,
  title,
}: {
  token: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setProblem(null);
    try {
      await postJson(`/api/v1/invites/${encodeURIComponent(token)}/accept`, {});
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setProblem(problemMessage(error));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {problem && <FormAlert title={problem} />}
      <button
        type="button"
        onClick={accept}
        disabled={pending}
        aria-busy={pending}
        className={`${buttonClass()} w-full`}
      >
        {pending ? "Joining…" : `Join ${title}`}
      </button>
    </div>
  );
}
