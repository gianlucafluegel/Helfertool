"use client";

import { useActionState } from "react";
import { addShiftSlot } from "@/lib/actions/events";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function AddShiftSlotForm({
  eventId,
  activities,
}: {
  eventId: string;
  activities: { id: string; name: string }[];
}) {
  const [error, formAction, pending] = useActionState(
    async (_prev: string | undefined, formData: FormData) => addShiftSlot(eventId, formData),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <datalist id="activity-suggestions">
        {activities.map((a) => (
          <option key={a.id} value={a.name} />
        ))}
      </datalist>
      <FormField
        label="Tätigkeit"
        name="activityName"
        list="activity-suggestions"
        required
        defaultValue="Helfer (allgemein)"
      />
      <FormField label="Anzahl Plätze" name="capacity" type="number" min={1} defaultValue={1} />
      <FormField label="Notiz (optional)" name="notes" />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird hinzugefügt…" : "Rolle hinzufügen"}
      </Button>
    </form>
  );
}
