"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { problemMessage } from "@/components/members/problem-message";
import { buttonClass } from "@/components/ui/ButtonLink";
import { patchJson } from "@/lib/api-client";

/** Marks a Pending payment Paid in one tap (PRD key flow F4, step 5). */
export function MarkPaidButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function markPaid() {
    setPending(true);
    setProblem(null);
    try {
      await patchJson(`/api/v1/expenses/${expenseId}`, { status: "PAID" });
      router.refresh();
    } catch (error) {
      setProblem(problemMessage(error));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={markPaid}
        disabled={pending}
        aria-busy={pending}
        className={buttonClass()}
      >
        {pending ? "Saving…" : "Mark as paid"}
      </button>
      {problem && (
        <p role="alert" className="text-small text-danger">
          {problem}
        </p>
      )}
    </div>
  );
}
