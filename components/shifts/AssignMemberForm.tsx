"use client";

import { useState, useTransition } from "react";
import { assignMemberToShiftSlot } from "@/lib/actions/events";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button } from "@/components/ui/Button";

export function AssignMemberForm({
  shiftSlotId,
  members,
}: {
  shiftSlotId: string;
  members: { id: string; firstName: string; lastName: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      action={(formData) => {
        const memberId = String(formData.get("memberId") ?? "");
        if (!memberId) {
          setError("Bitte zuerst ein Mitglied auswählen.");
          return;
        }
        setError(null);
        startTransition(async () => {
          const result = await assignMemberToShiftSlot(shiftSlotId, memberId);
          if (result.error) {
            setError(result.error);
          } else {
            setResetSignal((k) => k + 1);
          }
        });
      }}
    >
      <div className="w-56">
        <SearchableSelect
          key={resetSignal}
          name="memberId"
          placeholder="Mitglied zuordnen…"
          options={members.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }))}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="text-xs">
        {pending ? "Wird zugeordnet…" : "Zuordnen"}
      </Button>
      {error && <p className="w-full text-xs text-status-open-text">{error}</p>}
    </form>
  );
}
