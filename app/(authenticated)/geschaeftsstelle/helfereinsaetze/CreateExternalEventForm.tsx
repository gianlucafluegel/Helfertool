"use client";

import { useActionState } from "react";
import { createExternalEvent } from "@/lib/actions/events";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export function CreateExternalEventForm({
  members,
}: {
  members: { id: string; firstName: string; lastName: string }[];
}) {
  const [error, formAction, pending] = useActionState(createExternalEvent, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Titel" name="title" required placeholder="z.B. Vereinsfest 2027" />
      <FormField label="Ort" name="locationText" required placeholder="z.B. Schulhausplatz Thun" />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="description">
          Einsatzbeschrieb
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          placeholder="z.B. Aufbau/Abbau Festwirtschaft"
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="requirements">
          Anforderungen
        </label>
        <textarea
          id="requirements"
          name="requirements"
          required
          rows={2}
          placeholder="z.B. festes Schuhwerk, körperliche Arbeit"
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
      </div>
      <FormField label="Datum" name="date" type="date" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Start" name="startTime" type="time" required />
        <FormField label="Ende" name="endTime" type="time" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="memberId-search">
          Helfer (optional)
        </label>
        <SearchableSelect
          name="memberId"
          placeholder="Mitglied suchen…"
          options={members.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }))}
        />
      </div>
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Wird erstellt…" : "Helfereinsatz erstellen"}
      </Button>
    </form>
  );
}
