"use client";

import { useTransition } from "react";
import { deleteShiftSlot } from "@/lib/actions/events";

export function DeleteShiftSlotButton({
  eventId,
  shiftSlotId,
}: {
  eventId: string;
  shiftSlotId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Diese Rolle löschen?")) return;
        startTransition(() => deleteShiftSlot(eventId, shiftSlotId));
      }}
      className="text-xs font-medium text-status-open-text hover:underline"
    >
      Löschen
    </button>
  );
}
