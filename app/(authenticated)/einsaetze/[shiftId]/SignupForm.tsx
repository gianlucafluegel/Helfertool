"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createSignup } from "@/lib/actions/signups";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function SignupForm({
  shiftSlotId,
  requiresPayoutChoice,
  defaultFirstName,
  defaultLastName,
  defaultEmail,
  defaultPhone,
}: {
  shiftSlotId: string;
  requiresPayoutChoice: boolean;
  defaultFirstName: string;
  defaultLastName: string;
  defaultEmail: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [payoutType, setPayoutType] = useState<"HELFERKONTINGENT" | "BARBEZUG">(
    "HELFERKONTINGENT",
  );
  const [error, formAction, pending] = useActionState(async (_prev: string | undefined, formData: FormData) => {
    const result = await createSignup(_prev, formData);
    if (!result) {
      router.push("/einsaetze");
      router.refresh();
    }
    return result;
  }, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="shiftSlotId" value={shiftSlotId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Vorname"
          name="helperFirstName"
          required
          defaultValue={defaultFirstName}
        />
        <FormField label="Name" name="helperLastName" required defaultValue={defaultLastName} />
      </div>
      <FormField
        label="E-Mail (für die Bestätigung)"
        name="helperEmail"
        type="email"
        required
        defaultValue={defaultEmail}
      />
      <FormField
        label="Telefonnummer"
        name="helperPhone"
        type="tel"
        required
        defaultValue={defaultPhone}
      />

      {requiresPayoutChoice && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium text-text">Entschädigung</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="payoutType"
              value="HELFERKONTINGENT"
              checked={payoutType === "HELFERKONTINGENT"}
              onChange={() => setPayoutType("HELFERKONTINGENT")}
            />
            Helferkontingent (Stunden werden angerechnet)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="payoutType"
              value="BARBEZUG"
              checked={payoutType === "BARBEZUG"}
              onChange={() => setPayoutType("BARBEZUG")}
            />
            Barbezug (Auszahlung, IBAN erforderlich)
          </label>
          {payoutType === "BARBEZUG" && (
            <FormField label="IBAN" name="iban" required placeholder="CH00 0000 0000 0000 0000 0" />
          )}
        </div>
      )}

      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Wird angemeldet…" : "Einsatz übernehmen"}
      </Button>
    </form>
  );
}
