"use client";

import { useState, useTransition } from "react";
import { sendEventReminder, type ReminderScope } from "@/lib/actions/reminders";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Reminder für genau diesen Einsatz. Hat der Einsatz eine Stufe, darf die
 * Geschäftsstelle zwischen allen Mitgliedern und nur dieser Stufe wählen;
 * Stufenadmins erreichen immer nur die Stufe. Ohne Stufe (z.B. externe
 * Events) gehen Reminder immer an alle.
 */
export function EventReminderCard({
  eventId,
  stufeName,
  canChooseScope,
}: {
  eventId: string;
  stufeName: string | null;
  canChooseScope: boolean;
}) {
  const [scope, setScope] = useState<ReminderScope>(stufeName ? "STUFE" : "ALL");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const recipientLabel =
    scope === "STUFE" && stufeName ? `Mitglieder der Stufe ${stufeName}` : "alle Mitglieder";

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Reminder</h2>
      <p className="mb-3 text-sm text-muted">
        Erinnert per E-Mail an die noch offenen Rollen dieses Einsatzes.
      </p>

      {canChooseScope && stufeName ? (
        <div className="mb-3 flex flex-col gap-2">
          {(
            [
              ["STUFE", `Nur Mitglieder der Stufe ${stufeName}`],
              ["ALL", "Alle Mitglieder"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`reminder-scope-${eventId}`}
                checked={scope === value}
                onChange={() => {
                  setScope(value);
                  setConfirming(false);
                  setMessage(null);
                }}
              />
              {label}
            </label>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-sm text-text">
          Empfänger: {stufeName ? `Mitglieder der Stufe ${stufeName}` : "alle Mitglieder"}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <span className="text-sm text-text">Wirklich an {recipientLabel} senden?</span>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await sendEventReminder(eventId, scope);
                  setConfirming(false);
                  setMessage(
                    result.error ?? `Erinnerung an ${result.sent ?? 0} Empfänger gesendet.`,
                  );
                })
              }
            >
              {pending ? "Wird gesendet…" : "Ja, senden"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Abbrechen
            </Button>
          </>
        ) : (
          <Button
            type="button"
            onClick={() => {
              setMessage(null);
              setConfirming(true);
            }}
          >
            Reminder senden
          </Button>
        )}
        {message && <p className="text-sm text-muted">{message}</p>}
      </div>
    </Card>
  );
}
