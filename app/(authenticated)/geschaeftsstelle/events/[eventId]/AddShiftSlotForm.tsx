"use client";

import { useActionState } from "react";
import { addShiftSlot } from "@/lib/actions/events";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function AddShiftSlotForm({
  eventId,
  activities,
  ageGroups,
}: {
  eventId: string;
  activities: { id: string; name: string }[];
  ageGroups: { id: string; name: string }[];
}) {
  const [error, formAction, pending] = useActionState(
    async (_prev: string | undefined, formData: FormData) => addShiftSlot(eventId, formData),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Anzahl Plätze" name="capacity" type="number" min={1} defaultValue={1} />
        <FormField
          label="Stunden (Gutschrift)"
          name="creditHours"
          type="number"
          step="0.5"
          min={0}
          defaultValue={2.5}
        />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-text">Nur für Stufen (leer = alle)</p>
        <div className="flex flex-wrap gap-3">
          {ageGroups.map((ag) => (
            <label key={ag.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="ageGroupIds" value={ag.id} />
              {ag.name}
            </label>
          ))}
        </div>
      </div>
      <FormField label="Notiz (optional)" name="notes" />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird hinzugefügt…" : "Einsatz hinzufügen"}
      </Button>
    </form>
  );
}
