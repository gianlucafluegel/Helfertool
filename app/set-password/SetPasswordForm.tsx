"use client";

import { useActionState } from "react";
import { setPassword } from "@/lib/actions/auth";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function SetPasswordForm({ token, purpose }: { token: string; purpose: string }) {
  const [error, formAction, pending] = useActionState(setPassword, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="purpose" value={purpose} />
      <FormField
        label="Neues Passwort"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      <FormField
        label="Passwort bestätigen"
        name="passwordConfirm"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Wird gespeichert…" : "Passwort speichern"}
      </Button>
    </form>
  );
}
