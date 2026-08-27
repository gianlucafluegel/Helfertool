"use client";

import { useActionState } from "react";
import { createMember } from "@/lib/actions/members";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function CreateMemberForm() {
  const [error, formAction, pending] = useActionState(createMember, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Kontakt-ID" name="externalContactId" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Vorname" name="firstName" required />
        <FormField label="Name" name="lastName" required />
      </div>
      <FormField label="E-Mail" name="email" type="email" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Alter" name="age" type="number" min={0} required />
        <FormField
          label="Soll-Stunden"
          name="targetHours"
          type="number"
          step="0.5"
          min={0}
          required
        />
      </div>
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird erstellt…" : "Mitglied erfassen"}
      </Button>
    </form>
  );
}
