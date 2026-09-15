"use client";

import { useActionState } from "react";
import { createExternalEvent } from "@/lib/actions/events";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { RolesFieldset } from "./RolesFieldset";

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
      <RolesFieldset members={members} activityPlaceholder="Parkplatz" showRequirements />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Wird erstellt…" : "Helfereinsatz erstellen"}
      </Button>
    </form>
  );
}
