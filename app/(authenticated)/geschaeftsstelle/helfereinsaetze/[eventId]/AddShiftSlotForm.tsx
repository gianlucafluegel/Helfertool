"use client";

import { useActionState } from "react";
import { addShiftSlot } from "@/lib/actions/events";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function AddShiftSlotForm({
  eventId,
  eventType,
}: {
  eventId: string;
  eventType: "GAME" | "EXTERNAL";
}) {
  const [error, formAction, pending] = useActionState(
    async (_prev: string | undefined, formData: FormData) => addShiftSlot(eventId, formData),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <FormField label="Tätigkeit" name="activityName" required placeholder="Speaker" />
      <FormField label="Anzahl Plätze" name="capacity" type="number" min={1} placeholder="1" />
      <FormField
        label="Beschrieb"
        name="description"
        required
        placeholder="z.B. Betreuen der Strafbank"
      />
      {eventType === "EXTERNAL" && (
        <FormField label="Anforderungen (optional)" name="requirements" placeholder="z.B. Über 18" />
      )}
      <FormField label="Datum" name="date" type="date" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Start" name="startTime" type="time" required />
        <FormField label="Ende" name="endTime" type="time" required />
      </div>
      <FormField
        label="Anzahl Helferstunden"
        name="creditHours"
        type="number"
        step="0.5"
        min={0}
        required
      />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird hinzugefügt…" : "Rolle hinzufügen"}
      </Button>
    </form>
  );
}
