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
  ageGroupId,
  targetHours,
  ageGroups,
}: {
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ageGroupId: string | null;
  targetHours: number;
  ageGroups: { id: string; name: string }[];
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
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="ageGroupId">
            Stufe
          </label>
          <select
            id="ageGroupId"
            name="ageGroupId"
            defaultValue={ageGroupId ?? ""}
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
