"use client";

import { useState, useTransition } from "react";
import { updateSeasonLabel } from "@/lib/actions/season-archive";
import { Button } from "@/components/ui/Button";

export function SeasonLabelHeader({ seasonId, label }: { seasonId: string; label: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-navy">{label}</h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-gold-hover hover:underline"
        >
          Bearbeiten
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      action={(formData) =>
        startTransition(async () => {
          const result = await updateSeasonLabel(seasonId, formData);
          if (result) setError(result);
          else {
            setError(null);
            setEditing(false);
          }
        })
      }
    >
      <input
        type="text"
        name="label"
        defaultValue={label}
        required
        autoFocus
        className="rounded-lg border border-border bg-white px-3 py-1.5 text-2xl font-bold text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
      <Button type="submit" disabled={pending} className="text-sm">
        {pending ? "Wird gespeichert…" : "Speichern"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          setEditing(false);
        }}
        className="text-sm"
      >
        Abbrechen
      </Button>
      {error && <p className="w-full text-sm text-status-open-text">{error}</p>}
    </form>
  );
}
