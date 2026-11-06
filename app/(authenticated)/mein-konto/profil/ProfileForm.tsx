"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function ProfileForm({
  memberId,
  email,
  phone,
}: {
  memberId: string;
  email: string;
  phone: string;
}) {
  const [error, formAction, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="memberId" value={memberId} />
      <FormField label="Mobile" name="phone" type="tel" defaultValue={phone} />
      <FormField label="E-Mail" name="email" type="email" defaultValue={email} />
      <p className="text-xs text-muted">
        Diese Angaben sind nur im eingeloggten Bereich sichtbar, nicht öffentlich.
      </p>
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Wird gespeichert…" : "Änderungen speichern"}
      </Button>
    </form>
  );
}
