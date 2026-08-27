"use client";

import { useActionState } from "react";
import { addManualHours } from "@/lib/actions/members";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function ManualHoursForm({
  memberId,
  locations,
  activities,
}: {
  memberId: string;
  locations: { id: string; name: string }[];
  activities: { id: string; name: string }[];
}) {
  const [error, formAction, pending] = useActionState(
    async (_prev: string | undefined, formData: FormData) => addManualHours(memberId, formData),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Titel" name="title" required placeholder="z.B. Vereinsfest 2025" />
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
          rows={2}
          placeholder="z.B. Aufbau/Abbau Festwirtschaft"
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
      </div>
      <FormField label="Datum/Zeit" name="startDateTime" type="datetime-local" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="activityId">
            Tätigkeit
          </label>
          <select
            id="activityId"
            name="activityId"
            required
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="area">
            Bereich
          </label>
          <select
            id="area"
            name="area"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="HELFER">Helfer</option>
            <option value="FUNKTIONAER">Funktionär</option>
          </select>
        </div>
      </div>
      <FormField
        label="Stunden (Gutschrift)"
        name="creditHours"
        type="number"
        step="0.5"
        min={0}
        required
      />
      <FormField label="Notiz (optional)" name="notes" />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird hinzugefügt…" : "Stunden hinzufügen"}
      </Button>
    </form>
  );
}
