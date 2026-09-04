"use client";

import { useState, useTransition } from "react";
import { deleteShiftSlot } from "@/lib/actions/events";

export function DeleteShiftSlotButton({
  eventId,
  shiftSlotId,
}: {
  eventId: string;
  shiftSlotId: string;
}) {
  // Ersetzt einen nativen confirm()-Dialog: der bleibt in manchen Browsern
  // dauerhaft stumm, sobald einmal "Weitere Dialogfelder verhindern"
  // angehakt wurde — ohne sichtbaren Hinweis, dass er unterdrückt wird. Ein
  // Zwei-Klick-Ablauf in der App selbst umgeht das komplett (gleiches
  // Muster wie CancelSignupButton).
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="text-muted">Wirklich löschen?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => deleteShiftSlot(eventId, shiftSlotId))}
          className="font-medium text-status-open-text hover:underline disabled:opacity-50"
        >
          {pending ? "Wird gelöscht…" : "Ja, löschen"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="font-medium text-muted hover:text-text disabled:opacity-50"
        >
          Abbrechen
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs font-medium text-status-open-text hover:underline"
    >
      Löschen
    </button>
  );
}
