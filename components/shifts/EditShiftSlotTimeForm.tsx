"use client";

import { useState, useTransition } from "react";
import { updateShiftSlot } from "@/lib/actions/events";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

function toDateInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Erlaubt das nachträgliche Korrigieren von Datum/Start/Ende/Anzahl
 * Helferstunden einer bestehenden Rolle (z.B. bei einer Spielverschiebung) —
 * diese Felder werden sonst nur beim Erstellen einer Rolle erfasst. Die
 * Berechtigung wird serverseitig durch updateShiftSlot erzwungen, nicht
 * durch eine Prop.
 */
export function EditShiftSlotTimeForm({
  shiftSlotId,
  startDateTime,
  endDateTime,
  creditHours,
}: {
  shiftSlotId: string;
  startDateTime: Date;
  endDateTime: Date;
  creditHours: number;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs font-medium text-gold-hover hover:underline"
      >
        Zeit bearbeiten
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-border p-2"
      action={(formData) =>
        startTransition(async () => {
          const result = await updateShiftSlot(shiftSlotId, formData);
          if (result) setError(result);
          else {
            setError(null);
            setEditing(false);
          }
        })
      }
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <FormField
          label="Datum"
          name="date"
          type="date"
          defaultValue={toDateInputValue(startDateTime)}
          required
        />
        <FormField
          label="Start"
          name="startTime"
          type="time"
          defaultValue={toTimeInputValue(startDateTime)}
          required
        />
        <FormField
          label="Ende"
          name="endTime"
          type="time"
          defaultValue={toTimeInputValue(endDateTime)}
          required
        />
      </div>
      <FormField
        label="Anzahl Helferstunden"
        name="creditHours"
        type="number"
        step="0.5"
        min={0}
        defaultValue={creditHours}
        required
      />
      {error && <p className="text-xs text-status-open-text">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="text-xs">
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
          className="text-xs"
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
