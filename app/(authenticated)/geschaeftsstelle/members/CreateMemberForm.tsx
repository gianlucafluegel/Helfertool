"use client";

import { useActionState, useEffect, useRef } from "react";
import { createMember, type CreateMemberState } from "@/lib/actions/members";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function CreateMemberForm({ ageGroups }: { ageGroups: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<CreateMemberState, FormData>(createMember, {
    status: "idle",
  });
  const formRef = useRef<HTMLFormElement>(null);

  // Statt zur Detailseite umzuleiten, bleibt man auf dem Erfassungsformular
  // und bekommt nur eine kurze Erfolgsmeldung — die Weiterleitung auf die
  // Bearbeiten-Seite wirkte so, als müsse man dort noch etwas tun.
  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <FormField label="Kontakt-ID" name="externalContactId" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Vorname" name="firstName" required />
        <FormField label="Name" name="lastName" required />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="E-Mail" name="email" type="email" required />
        <FormField label="Telefon" name="phone" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="ageGroupId">
            Team
          </label>
          <select
            id="ageGroupId"
            name="ageGroupId"
            required
            defaultValue=""
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
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
          required
        />
      </div>
      {state.status === "error" && <p className="text-sm text-status-open-text">{state.message}</p>}
      {state.status === "success" && (
        <p className="text-sm text-status-filled-text">Mitglied wurde erstellt.</p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird erstellt…" : "Mitglied erfassen"}
      </Button>
    </form>
  );
}
