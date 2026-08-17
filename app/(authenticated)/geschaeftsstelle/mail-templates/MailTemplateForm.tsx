"use client";

import { useTransition } from "react";
import { updateMailTemplate } from "@/lib/actions/mail-templates";
import type { MailTemplateKey } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/Button";

const LABELS: Record<MailTemplateKey, string> = {
  SIGNUP_CONFIRMATION: "Bestätigung bei Anmeldung",
  REMINDER_UNFILLED: "Reminder für offene Einsätze",
  ACCOUNT_SETUP: "Login-Einladung",
  PASSWORD_RESET: "Passwort zurücksetzen",
};

export function MailTemplateForm({
  templateKey,
  subject,
  bodyText,
}: {
  templateKey: MailTemplateKey;
  subject: string;
  bodyText: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-text">{LABELS[templateKey]}</h3>
      <form
        className="flex flex-col gap-3"
        action={(formData) => startTransition(() => updateMailTemplate(templateKey, formData))}
      >
        <input
          name="subject"
          defaultValue={subject}
          className="rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Betreff"
        />
        <textarea
          name="bodyText"
          defaultValue={bodyText}
          rows={6}
          className="rounded-lg border border-border px-3 py-2 text-sm font-mono"
        />
        <p className="text-xs text-muted">
          Platzhalter: {"{{vorname}}"} {"{{nachname}}"} {"{{event}}"} {"{{datum}}"}{" "}
          {"{{taetigkeit}}"} {"{{standort}}"} {"{{link}}"}
        </p>
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Wird gespeichert…" : "Speichern"}
        </Button>
      </form>
    </div>
  );
}
