"use client";

import { useActionState } from "react";
import { createAgeGroup } from "@/lib/actions/catalog";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function CreateAgeGroupForm() {
  const [error, formAction, pending] = useActionState(createAgeGroup, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <FormField label="Name" name="name" required placeholder="U9" />
      <FormField label="Reihenfolge" name="sortOrder" type="number" defaultValue={0} />
      <label className="flex items-center gap-1.5 pb-2 text-sm">
        <input type="checkbox" name="triggersBarbezugChoice" />
        Barbezug-Wahl (Schiedsrichter)
      </label>
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Wird erstellt…" : "Hinzufügen"}
      </Button>
    </form>
  );
}
