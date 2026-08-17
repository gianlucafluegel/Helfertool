"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const [message, formAction, pending] = useActionState(requestPasswordReset, undefined);

  if (message) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text">{message}</p>
        <Link href="/login" className="text-sm text-muted hover:text-text">
          Zurück zum Login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="E-Mail" name="email" type="email" required autoComplete="email" />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Wird gesendet…" : "Link zum Zurücksetzen senden"}
      </Button>
      <Link href="/login" className="text-center text-sm text-muted hover:text-text">
        Zurück zum Login
      </Link>
    </form>
  );
}
