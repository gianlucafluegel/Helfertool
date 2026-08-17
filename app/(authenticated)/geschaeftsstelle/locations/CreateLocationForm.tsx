"use client";

import { useActionState } from "react";
import { createLocation } from "@/lib/actions/catalog";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function CreateLocationForm() {
  const [error, formAction, pending] = useActionState(createLocation, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <FormField label="Name" name="name" required placeholder="Sagibach Wichtrach" />
      <FormField label="Adresse (optional)" name="address" />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Wird erstellt…" : "Hinzufügen"}
      </Button>
    </form>
  );
}
