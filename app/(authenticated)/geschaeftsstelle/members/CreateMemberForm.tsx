"use client";

import { useActionState } from "react";
import { createMember } from "@/lib/actions/members";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function CreateMemberForm({ ageGroups }: { ageGroups: { id: string; name: string }[] }) {
  const [error, formAction, pending] = useActionState(createMember, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Vorname" name="firstName" required />
        <FormField label="Name" name="lastName" required />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="E-Mail" name="email" type="email" />
        <FormField label="Telefon" name="phone" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="ageGroupId">
            Stufe/Team
          </label>
          <select
            id="ageGroupId"
            name="ageGroupId"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">–</option>
            {ageGroups.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name}
              </option>
            ))}
          </select>
        </div>
        <FormField label="Soll-Stunden" name="targetHours" type="number" step="0.5" min={0} defaultValue={0} />
      </div>
      <FormField label="Kontakt-ID (optional, für Import/Export)" name="externalContactId" />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird erstellt…" : "Mitglied erfassen"}
      </Button>
    </form>
  );
}
