"use client";

import { useActionState } from "react";
import { createActivity } from "@/lib/actions/catalog";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function CreateActivityForm() {
  const [error, formAction, pending] = useActionState(createActivity, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <FormField label="Name" name="name" required placeholder="Speaker" />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="defaultArea">
          Standard-Bereich
        </label>
        <select
          id="defaultArea"
          name="defaultArea"
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="HELFER">Helfer</option>
          <option value="FUNKTIONAER">Funktionär</option>
        </select>
      </div>
      <label className="flex items-center gap-1.5 pb-2 text-sm">
        <input type="checkbox" name="requiresPayoutChoice" />
        Barbezug/Kontingent-Wahl (z.B. Schiedsrichter)
      </label>
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Wird erstellt…" : "Hinzufügen"}
      </Button>
    </form>
  );
}
