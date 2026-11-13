"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteJson, postJson } from "@/lib/api-client";

import { problemMessage } from "./problem-message";

const actionClass =
  "min-h-11 rounded-control px-3 text-small font-medium focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-70";

/** Resend (new link, 7 more days) and Cancel for a pending invite. */
export function InviteActions({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"resend" | "cancel" | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(kind: "resend" | "cancel") {
    setPending(kind);
    setNote(null);
    try {
      if (kind === "resend") {
        await postJson(`/api/v1/invites/${inviteId}/resend`, {});
        setNote({
          ok: true,
          text: "Sent again. The new link works for 7 days.",
        });
      } else {
        await deleteJson(`/api/v1/invites/${inviteId}`);
      }
      router.refresh();
    } catch (error) {
      setNote({ ok: false, text: problemMessage(error) });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => run("resend")}
          disabled={pending !== null}
          className={`${actionClass} text-accent hover:bg-accent-tint`}
        >
          {pending === "resend" ? "Sending…" : "Resend"}
        </button>
        <span aria-hidden="true" className="h-4 w-px bg-border" />
        <button
          type="button"
          onClick={() => run("cancel")}
          disabled={pending !== null}
          className={`${actionClass} text-text-muted hover:text-danger`}
        >
          {pending === "cancel" ? "Cancelling…" : "Cancel invite"}
        </button>
      </div>
      {note && (
        <p
          role={note.ok ? "status" : "alert"}
          className={`max-w-xs text-small sm:text-right ${note.ok ? "text-success" : "text-danger"}`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
