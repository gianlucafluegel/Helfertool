"use client";

import { useActionState } from "react";
import { archiveSeason } from "@/lib/actions/season-archive";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export function ArchiveSeasonForm({ currentSeasonLabel }: { currentSeasonLabel: string }) {
  const [error, formAction, pending] = useActionState(archiveSeason, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-status-open-text">
        Archiviert Saison <strong>{currentSeasonLabel}</strong> — alle Mitglieder, Helfereinsätze
        und Anmeldungen werden aus der aktiven Datenbank entfernt (weiterhin einsehbar unter
        „Archivierte Saisons“) und eine neue, leere Saison wird angelegt. Diese Aktion kann nicht
        rückgängig gemacht werden.
      </p>

      <FormField
        label="Bezeichnung neue Saison"
        name="newSeasonLabel"
        required
        placeholder="z.B. 2027/2028"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Start neue Saison" name="newSeasonStart" type="date" required />
        <FormField label="Ende neue Saison" name="newSeasonEnd" type="date" required />
      </div>

      <FormField
        label={`Zur Bestätigung "${currentSeasonLabel}" eingeben`}
        name="confirmLabel"
        required
        placeholder={currentSeasonLabel}
      />

      {error && <p className="text-sm text-status-open-text">{error}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird archiviert…" : "Saison archivieren & zurücksetzen"}
      </Button>
    </form>
  );
}
