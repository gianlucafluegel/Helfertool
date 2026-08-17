"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [error, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FormField label="E-Mail" name="email" type="email" required autoComplete="email" />
      <FormField
        label="Passwort"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Anmelden…" : "Anmelden"}
      </Button>
      <Link href="/forgot-password" className="text-center text-sm text-muted hover:text-text">
        Passwort vergessen?
      </Link>
    </form>
  );
}
