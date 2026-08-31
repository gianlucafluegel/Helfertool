"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { sendReminders } from "@/lib/actions/reminders";
import { Button } from "@/components/ui/Button";

export function ReminderForm({
  availableAgeGroups,
  lockedAgeGroupIds,
  showFunktionaereOption = false,
}: {
  availableAgeGroups: { id: string; name: string }[];
  lockedAgeGroupIds?: string[];
  showFunktionaereOption?: boolean;
}) {
  // Standardmässig ist nichts ausgewählt — die Geschäftsstelle soll die
  // Gruppe(n) bewusst auswählen, statt versehentlich an alle zu senden.
  const [selected, setSelected] = useState<string[]>(lockedAgeGroupIds ?? []);
  const [includeFunktionaere, setIncludeFunktionaere] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const nothingSelected = selected.length === 0 && !includeFunktionaere;

  return (
    <div className="flex flex-col gap-4">
      {!lockedAgeGroupIds && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {availableAgeGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g.id)}
              className={clsx(
                "rounded-xl border-2 px-4 py-3 text-left text-base font-semibold transition-colors",
                selected.includes(g.id)
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-white text-text hover:border-navy/40",
              )}
            >
              {g.name}
            </button>
          ))}
          {showFunktionaereOption && (
            <button
              type="button"
              onClick={() => setIncludeFunktionaere((prev) => !prev)}
              className={clsx(
                "rounded-xl border-2 px-4 py-3 text-left text-base font-semibold transition-colors",
                includeFunktionaere
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-white text-text hover:border-navy/40",
              )}
            >
              Funktionäre
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={pending || nothingSelected}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = await sendReminders({
                ageGroupIds: selected,
                includeFunktionaere,
              });
              if (result.error) setMessage(result.error);
              else setMessage(`Erinnerung an ${result.sent ?? 0} Empfänger gesendet.`);
            });
          }}
        >
          {pending ? "Wird gesendet…" : "Reminder senden"}
        </Button>
        {nothingSelected && !pending && (
          <p className="text-sm text-muted">Bitte mindestens eine Gruppe auswählen.</p>
        )}
        {message && <p className="text-sm text-muted">{message}</p>}
      </div>
    </div>
  );
}
