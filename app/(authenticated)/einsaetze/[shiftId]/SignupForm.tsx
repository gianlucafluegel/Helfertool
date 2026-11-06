"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createSignup } from "@/lib/actions/signups";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function SignupForm({
  shiftSlotId,
  requiresWristbandPickupChoice,
  defaultFirstName,
  defaultLastName,
  defaultEmail,
  defaultPhone,
}: {
  shiftSlotId: string;
  requiresWristbandPickupChoice: boolean;
  defaultFirstName: string;
  defaultLastName: string;
  defaultEmail: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [wristbandPickup, setWristbandPickup] = useState<"GESCHAEFTSSTELLE" | "TRAINING" | "">(
    "",
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

      {requiresWristbandPickupChoice && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium text-text">Wo möchtest du dein Armband abholen?</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="wristbandPickup"
              value="GESCHAEFTSSTELLE"
              required
              checked={wristbandPickup === "GESCHAEFTSSTELLE"}
              onChange={() => setWristbandPickup("GESCHAEFTSSTELLE")}
            />
            Auf der Geschäftsstelle (Bierigutstrasse 14, 3608 Thun)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="wristbandPickup"
              value="TRAINING"
              required
              checked={wristbandPickup === "TRAINING"}
              onChange={() => setWristbandPickup("TRAINING")}
            />
            Im Training
          </label>
        </div>
      )}

      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Wird angemeldet…" : "Einsatz übernehmen"}
      </Button>
    </form>
  );
}
