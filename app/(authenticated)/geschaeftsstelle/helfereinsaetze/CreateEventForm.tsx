"use client";

import { useActionState } from "react";
import { createEvent } from "@/lib/actions/events";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function CreateEventForm({
  seasonId,
  locations,
}: {
  seasonId: string;
  locations: { id: string; name: string }[];
}) {
  const [error, formAction, pending] = useActionState(createEvent, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="seasonId" value={seasonId} />
      <FormField label="Titel" name="title" required placeholder="MS U14 · SC Muster-Bern" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="type">
            Typ
          </label>
          <select
            id="type"
            name="type"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="GAME">Spiel</option>
            <option value="EXTERNAL">Externes Event</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="locationId">
            Standort
          </label>
          <select
            id="locationId"
            name="locationId"
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
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="description">
          Beschreibung
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          placeholder="z.B. Meisterschaftsspiel gegen SC Muster-Bern"
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
      </div>
      <FormField label="Datum/Zeit" name="startDateTime" type="datetime-local" required />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Wird erstellt…" : "Helfereinsatz erstellen"}
      </Button>
    </form>
  );
}
