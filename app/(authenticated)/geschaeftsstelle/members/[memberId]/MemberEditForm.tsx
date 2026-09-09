"use client";

import { useState, useTransition } from "react";
import { updateMember, deactivateMember, reactivateMember } from "@/lib/actions/members";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/generated/prisma/enums";

export function MemberEditForm({
  memberId,
  firstName,
  lastName,
  email,
  phone,
  ageGroupId,
  targetHours,
  ageGroups,
  isActive,
  role,
}: {
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ageGroupId: string | null;
  targetHours: number;
  ageGroups: { id: string; name: string }[];
  isActive: boolean;
  role?: UserRole;
}) {
  const showTeam = role !== "FUNKTIONAER";
  const [pending, startTransition] = useTransition();
  // Ersetzt einen nativen confirm()-Dialog: der bleibt in manchen Browsern
  // dauerhaft stumm, sobald einmal "Weitere Dialogfelder verhindern"
  // angehakt wurde — ohne sichtbaren Hinweis, dass er unterdrückt wird. Ein
  // Zwei-Klick-Ablauf in der App selbst umgeht das komplett.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
      {showTeam ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text" htmlFor="ageGroupId">
              Team
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
      ) : (
        <FormField
          label="Soll-Stunden"
          name="targetHours"
          type="number"
          step="0.5"
          min={0}
          defaultValue={targetHours}
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Wird gespeichert…" : "Speichern"}
        </Button>
        {isActive ? (
          confirmingDelete ? (
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="text-muted">Wirklich löschen?</span>
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={() => {
                  setConfirmingDelete(false);
                  startTransition(() => deactivateMember(memberId));
                }}
              >
                {pending ? "Wird gelöscht…" : "Ja, löschen"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirmingDelete(false)}
              >
                Abbrechen
              </Button>
            </span>
          ) : (
            <Button type="button" variant="danger" onClick={() => setConfirmingDelete(true)}>
              Mitglied löschen
            </Button>
          )
        ) : (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => startTransition(() => reactivateMember(memberId))}
          >
            {pending ? "Wird reaktiviert…" : "Mitglied reaktivieren"}
          </Button>
        )}
      </div>
    </form>
  );
}
