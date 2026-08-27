"use client";

import { useState, useTransition } from "react";
import { sendReminders } from "@/lib/actions/reminders";
import { Button } from "@/components/ui/Button";

export function ReminderForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await sendReminders();
            if (result.error) setMessage(result.error);
            else setMessage(`Erinnerung an ${result.sent ?? 0} Empfänger gesendet.`);
          });
        }}
      >
        {pending ? "Wird gesendet…" : "Reminder senden"}
      </Button>
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
