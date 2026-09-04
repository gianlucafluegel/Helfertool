"use client";

import { useTransition } from "react";
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
  status,
  locations,
  canDelete = true,
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
  status: string;
  locations: { id: string; name: string }[];
  canDelete?: boolean;
}) {
  const [pending, startTransition] = useTransition();

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

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Wird gespeichert…" : "Speichern"}
        </Button>
        {canDelete && (
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (confirm("Diesen Helfereinsatz wirklich löschen?")) {
                startTransition(() => deleteEvent(eventId));
              }
            }}
          >
            Helfereinsatz löschen
          </Button>
        )}
      </div>
    </form>
  );
}
