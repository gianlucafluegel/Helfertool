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

// Muss exakt widerspiegeln, was der jeweilige sendMail(...)-Aufruf im Code
// tatsächlich übergibt (lib/actions/signups.ts, reminders.ts, staff.ts,
// members.ts, auth.ts) — ein hier gelisteter, aber nicht übergebener
// Platzhalter würde in der versendeten Mail unverändert als "{{...}}"
// stehen bleiben, statt ersetzt zu werden.
const PLACEHOLDERS: Record<MailTemplateKey, string[]> = {
  SIGNUP_CONFIRMATION: ["vorname", "nachname", "event", "datum", "taetigkeit", "standort"],
  REMINDER_UNFILLED: ["vorname", "nachname", "event", "datum", "standort"],
  ACCOUNT_SETUP: ["vorname", "nachname", "link"],
  PASSWORD_RESET: ["vorname", "nachname", "link"],
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
          Platzhalter: {PLACEHOLDERS[templateKey].map((p) => `{{${p}}}`).join(" ")}
        </p>
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Wird gespeichert…" : "Speichern"}
        </Button>
      </form>
    </div>
  );
}
