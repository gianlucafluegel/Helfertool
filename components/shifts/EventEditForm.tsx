"use client";

import { useState, useTransition } from "react";
import { updateEvent, deleteEvent } from "@/lib/actions/events";
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

export function EventEditForm({
  eventId,
  type,
  title,
  description,
  locationId,
  locationText,
  requirements,
  startDateTime,
  endDateTime,
  creditHours,
  ageGroupId,
  ageGroups,
  locations,
  canDelete = true,
  canEditAgeGroup = true,
}: {
  eventId: string;
  type: "GAME" | "EXTERNAL";
  title: string;
  description: string;
  locationId: string;
  locationText: string;
  requirements: string;
  startDateTime: Date;
  endDateTime: Date | null;
  creditHours: number;
  ageGroupId: string;
  ageGroups: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  canDelete?: boolean;
  /** Off for Stufenleiter — nur Geschäftsstelle darf die Stufe ändern. */
  canEditAgeGroup?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  // Ersetzt einen nativen confirm()-Dialog: der bleibt in manchen Browsern
  // dauerhaft stumm, sobald einmal "Weitere Dialogfelder verhindern"
  // angehakt wurde — ohne sichtbaren Hinweis, dass er unterdrückt wird. Ein
  // Zwei-Klick-Ablauf in der App selbst umgeht das komplett.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => startTransition(() => updateEvent(eventId, formData))}
    >
      <FormField label="Titel" name="title" required defaultValue={title} />

      {type === "GAME" ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="locationId">
            Standort
          </label>
          <select
            id="locationId"
            name="locationId"
            defaultValue={locationId}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">–</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <FormField label="Ort" name="locationText" required defaultValue={locationText} />
      )}

      {type === "GAME" && canEditAgeGroup && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="ageGroupId">
            Stufe
          </label>
          <select
            id="ageGroupId"
            name="ageGroupId"
            defaultValue={ageGroupId}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">–</option>
            {ageGroups.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="description">
          Einsatzbeschrieb
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          defaultValue={description}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
      </div>

      {type === "EXTERNAL" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="requirements">
            Anforderungen
          </label>
          <textarea
            id="requirements"
            name="requirements"
            required
            rows={2}
            defaultValue={requirements}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
        </div>
      )}

      <FormField label="Datum" name="date" type="date" defaultValue={toDateInputValue(startDateTime)} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Start"
          name="startTime"
          type="time"
          defaultValue={toTimeInputValue(startDateTime)}
        />
        <FormField
          label="Ende"
          name="endTime"
          type="time"
          defaultValue={endDateTime ? toTimeInputValue(endDateTime) : ""}
        />
      </div>

      <FormField
        label="Anzahl Helferstunden"
        name="creditHours"
        type="number"
        step="0.5"
        min={0}
        required
        defaultValue={creditHours}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Wird gespeichert…" : "Speichern"}
        </Button>
        {canDelete &&
          (confirmingDelete ? (
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="text-muted">Wirklich löschen?</span>
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={() => startTransition(() => deleteEvent(eventId))}
              >
                {pending ? "Wird gelöscht…" : "Ja, löschen"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirmingDelete(false)}
              >
                Abbrechen
              </Button>
            </span>
          ) : (
            <Button type="button" variant="danger" onClick={() => setConfirmingDelete(true)}>
              Helfereinsatz löschen
            </Button>
          ))}
      </div>
    </form>
  );
}
