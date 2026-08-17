"use client";

import { useTransition } from "react";
import { updateEvent, deleteEvent } from "@/lib/actions/events";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventEditForm({
  eventId,
  title,
  opponent,
  locationId,
  startDateTime,
  status,
  locations,
}: {
  eventId: string;
  title: string;
  opponent: string;
  locationId: string;
  startDateTime: Date;
  status: string;
  locations: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => startTransition(() => updateEvent(eventId, formData))}
    >
      <FormField label="Titel" name="title" required defaultValue={title} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="SCHEDULED">Geplant</option>
            <option value="POSTPONED">Verschoben</option>
            <option value="CANCELLED">Abgesagt</option>
          </select>
        </div>
      </div>
      <FormField label="Gegner" name="opponent" defaultValue={opponent} />
      <FormField
        label="Datum/Zeit"
        name="startDateTime"
        type="datetime-local"
        defaultValue={toLocalInputValue(startDateTime)}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Wird gespeichert…" : "Speichern"}
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            if (confirm("Dieses Event wirklich löschen?")) {
              startTransition(() => deleteEvent(eventId));
            }
          }}
        >
          Event löschen
        </Button>
      </div>
    </form>
  );
}
