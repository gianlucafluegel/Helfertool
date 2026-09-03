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
        Archiviert Saison <strong>{currentSeasonLabel}</strong> — alle Helfereinsätze und
        Anmeldungen werden aus der aktiven Datenbank entfernt (weiterhin einsehbar unter
        „Archivierte Saisons“) und eine neue Saison wird angelegt (Start/Ende automatisch ein Jahr
        ab dem Ende der aktuellen Saison). Mitglieder, Logins und Teams bleiben erhalten — nur die
        Soll-Stunden werden auf 0 zurückgesetzt (der nächste Mitglieder-Import setzt sie neu).
        Diese Aktion kann nicht rückgängig gemacht werden.
      </p>

      <FormField
        label="Bezeichnung neue Saison"
        name="newSeasonLabel"
        required
        placeholder="z.B. 2027/2028"
      />

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
