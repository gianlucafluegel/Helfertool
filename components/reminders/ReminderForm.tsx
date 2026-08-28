"use client";

import { useState, useTransition } from "react";
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
  const [selected, setSelected] = useState<string[]>(
    lockedAgeGroupIds ?? availableAgeGroups.map((g) => g.id),
  );
  const [includeFunktionaere, setIncludeFunktionaere] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {!lockedAgeGroupIds && (
        <div className="flex flex-wrap gap-3">
          {availableAgeGroups.map((g) => (
            <label key={g.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(g.id)}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id),
                  )
                }
              />
              {g.name}
            </label>
          ))}
          {showFunktionaereOption && (
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={includeFunktionaere}
                onChange={(e) => setIncludeFunktionaere(e.target.checked)}
              />
              Funktionäre
            </label>
          )}
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={pending}
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
        {message && <p className="text-sm text-muted">{message}</p>}
      </div>
    </div>
  );
}
