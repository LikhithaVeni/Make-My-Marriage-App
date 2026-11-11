"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { postJson } from "@/lib/api-client";

/** Ends this session and goes to the log-in page. */
export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await postJson("/api/v1/auth/logout", {});
    } catch {
      // Even if the call failed, the log-in page is the right place: from
      // there the user can log in again or retry.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className={`rounded-control font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-70 ${className}`}
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
