"use client";

import { useState, useTransition } from "react";
import { updateSignupContact } from "@/lib/actions/signups";
import { cancelSignup } from "@/lib/actions/signups";
import { Button } from "@/components/ui/Button";

export function AdminSignupRow({
  signup,
}: {
  signup: {
    id: string;
    helperFirstName: string;
    helperLastName: string;
    helperEmail: string;
    helperPhone: string | null;
  };
}) {
  const [editing, setEditing] = useState(false);
  // Ersetzt einen nativen confirm()-Dialog: der bleibt in manchen Browsern
  // dauerhaft stumm, sobald einmal "Weitere Dialogfelder verhindern"
  // angehakt wurde — ohne sichtbaren Hinweis, dass er unterdrückt wird. Ein
  // Zwei-Klick-Ablauf in der App selbst umgeht das komplett.
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <form
        className="flex flex-col gap-2 rounded-lg border border-border p-3"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await updateSignupContact(signup.id, formData);
            if (result.error) setError(result.error);
            else setEditing(false);
          });
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            name="helperFirstName"
            defaultValue={signup.helperFirstName}
            className="rounded border border-border px-2 py-1 text-sm"
            placeholder="Vorname"
          />
          <input
            name="helperLastName"
            defaultValue={signup.helperLastName}
            className="rounded border border-border px-2 py-1 text-sm"
            placeholder="Name"
          />
        </div>
        <input
          name="helperEmail"
          defaultValue={signup.helperEmail}
          className="rounded border border-border px-2 py-1 text-sm"
          placeholder="E-Mail"
        />
        <input
          name="helperPhone"
          defaultValue={signup.helperPhone ?? ""}
          className="rounded border border-border px-2 py-1 text-sm"
          placeholder="Telefon"
        />
        {error && <p className="text-xs text-status-open-text">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={pending} className="text-xs">
            Speichern
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)} className="text-xs">
            Abbrechen
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex flex-col">
        <p className="text-base font-semibold text-text">
          {signup.helperFirstName} {signup.helperLastName}
        </p>
        <p className="text-sm text-muted">{signup.helperEmail}</p>
        {signup.helperPhone && <p className="text-sm text-muted">{signup.helperPhone}</p>}
        {error && <p className="text-xs text-status-open-text">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        {confirmingRemove ? (
          <>
            <span className="text-xs text-muted">Wirklich entfernen?</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await cancelSignup(signup.id);
                  if (result.error) setError(result.error);
                  setConfirmingRemove(false);
                });
              }}
              className="text-xs font-medium text-status-open-text hover:underline disabled:opacity-50"
            >
              {pending ? "Wird entfernt…" : "Ja, entfernen"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmingRemove(false)}
              className="text-xs font-medium text-muted hover:text-text disabled:opacity-50"
            >
              Abbrechen
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-medium text-muted hover:text-text"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRemove(true)}
              className="text-xs font-medium text-status-open-text hover:underline"
            >
              Entfernen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
