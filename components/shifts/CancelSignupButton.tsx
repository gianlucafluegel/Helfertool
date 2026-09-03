"use client";

import { useState, useTransition } from "react";
import { cancelSignup } from "@/lib/actions/signups";

export function CancelSignupButton({ signupId }: { signupId: string }) {
  // Ersetzt einen nativen confirm()-Dialog: der bleibt in manchen Browsern
  // dauerhaft stumm, sobald einmal "Weitere Dialogfelder verhindern"
  // angehakt wurde — ohne sichtbaren Hinweis, dass er unterdrückt wird. Ein
  // Zwei-Klick-Ablauf in der App selbst umgeht das komplett.
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function doCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelSignup(signupId);
      if (result.error) setError(result.error);
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text">Wirklich abmelden?</span>
          <button
            type="button"
            disabled={pending}
            onClick={doCancel}
            className="rounded-full bg-status-open-text px-3.5 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Wird abgemeldet…" : "Ja, abmelden"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-medium text-text hover:border-navy/40 disabled:opacity-50"
          >
            Abbrechen
          </button>
        </div>
        {error && <p className="max-w-56 text-right text-xs text-status-open-text">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-medium text-text hover:border-status-open-text hover:text-status-open-text"
      >
        Abmelden
      </button>
      {error && <p className="max-w-56 text-right text-xs text-status-open-text">{error}</p>}
    </div>
  );
}
