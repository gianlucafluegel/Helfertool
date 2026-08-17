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
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-sm text-text">
          {signup.helperFirstName} {signup.helperLastName}{" "}
          <span className="text-muted">· {signup.helperEmail}</span>
        </p>
        {error && <p className="text-xs text-status-open-text">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-muted hover:text-text"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Diese Anmeldung entfernen?")) return;
            setError(null);
            startTransition(async () => {
              const result = await cancelSignup(signup.id);
              if (result.error) setError(result.error);
            });
          }}
          className="text-xs font-medium text-status-open-text hover:underline"
        >
          Entfernen
        </button>
      </div>
    </div>
  );
}
