"use client";

import { useActionState, useEffect, useRef } from "react";
import type { CreateStaffState } from "@/lib/actions/staff";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function CreateStaffForm({
  action,
  submitLabel,
  successMessage,
  ageGroups,
  showContactAndHours = true,
}: {
  action: (prevState: CreateStaffState, formData: FormData) => Promise<CreateStaffState>;
  submitLabel: string;
  successMessage: string;
  /** Present only for Stufenadmins — lets you pick which Stufe(n) they administer. */
  ageGroups?: { id: string; name: string }[];
  /** Off for Stufenadmins — they only need Vorname/Nachname/E-Mail/Stufe(n). */
  showContactAndHours?: boolean;
}) {
  const [state, formAction, pending] = useActionState<CreateStaffState, FormData>(action, {
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
      {showContactAndHours && <FormField label="Kontakt-ID" name="externalContactId" required />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Vorname" name="firstName" required />
        <FormField label="Name" name="lastName" required />
      </div>
      {showContactAndHours ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="E-Mail" name="email" type="email" required />
          <FormField label="Telefon" name="phone" />
        </div>
      ) : (
        <FormField label="E-Mail" name="email" type="email" required />
      )}
      {showContactAndHours && (
        <FormField
          label="Soll-Stunden"
          name="targetHours"
          type="number"
          step="0.5"
          min={0}
          required
        />
      )}
      {ageGroups && (
        <div>
          <p className="mb-1 text-sm font-medium text-text">Zuständig für Team(s)</p>
          <div className="flex flex-wrap gap-3">
            {ageGroups.map((ag) => (
              <label key={ag.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="stufenleiterAgeGroupIds" value={ag.id} />
                {ag.name}
              </label>
            ))}
          </div>
        </div>
      )}
      {state.status === "error" && <p className="text-sm text-status-open-text">{state.message}</p>}
      {state.status === "success" && (
        <p className="text-sm text-status-filled-text">{successMessage}</p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird erstellt und eingeladen…" : submitLabel}
      </Button>
    </form>
  );
}
