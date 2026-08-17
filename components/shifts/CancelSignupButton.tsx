"use client";

import { useState, useTransition } from "react";
import { cancelSignup } from "@/lib/actions/signups";

export function CancelSignupButton({ signupId }: { signupId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Diesen Einsatz wirklich abmelden?")) return;
          setError(null);
          startTransition(async () => {
            const result = await cancelSignup(signupId);
            if (result.error) setError(result.error);
          });
        }}
        className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-medium text-text hover:border-status-open-text hover:text-status-open-text disabled:opacity-50"
      >
        {pending ? "Wird abgemeldet…" : "Abmelden"}
      </button>
      {error && <p className="max-w-56 text-right text-xs text-status-open-text">{error}</p>}
    </div>
  );
}
