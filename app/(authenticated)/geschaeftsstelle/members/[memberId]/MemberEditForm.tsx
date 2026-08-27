"use client";

import { useTransition } from "react";
import { updateMember } from "@/lib/actions/members";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function MemberEditForm({
  memberId,
  firstName,
  lastName,
  email,
  phone,
  age,
  targetHours,
}: {
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number | null;
  targetHours: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => startTransition(() => updateMember(memberId, formData))}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Vorname" name="firstName" required defaultValue={firstName} />
        <FormField label="Name" name="lastName" required defaultValue={lastName} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="E-Mail" name="email" type="email" defaultValue={email} />
        <FormField label="Telefon" name="phone" defaultValue={phone} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Alter" name="age" type="number" min={0} defaultValue={age ?? ""} />
        <FormField
          label="Soll-Stunden"
          name="targetHours"
          type="number"
          step="0.5"
          min={0}
          defaultValue={targetHours}
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird gespeichert…" : "Speichern"}
      </Button>
    </form>
  );
}
