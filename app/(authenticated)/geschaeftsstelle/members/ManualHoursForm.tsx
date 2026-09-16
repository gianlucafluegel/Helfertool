"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addManualHours } from "@/lib/actions/members";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export function ManualHoursForm({
  members,
  locations,
  memberLabel = "Mitglied",
  defaultArea = "HELFER",
}: {
  members: { id: string; firstName: string; lastName: string }[];
  locations: { id: string; name: string }[];
  /** Overrides the "Mitglied" wording, e.g. "Funktionär" on that section. */
  memberLabel?: string;
  /** Bereich ist hier kein Formularfeld — er ergibt sich aus dem Kontext der
   * aufrufenden Seite (Mitglieder → HELFER, Funktionäre → FUNKTIONAER) und
   * wird als verstecktes Feld mitgeschickt. */
  defaultArea?: "HELFER" | "FUNKTIONAER";
}) {
  const [error, formAction, pending] = useActionState(addManualHours, undefined);

  // The searchable member field is a controlled component, so a successful
  // submit needs an explicit signal to clear it back to empty (unlike the
  // form's plain uncontrolled fields, which reset on their own).
  const [resetSignal, setResetSignal] = useState(0);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setResetSignal((k) => k + 1);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="area" value={defaultArea} />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="memberId-search">
          {memberLabel}
        </label>
        <SearchableSelect
          key={resetSignal}
          name="memberId"
          required
          placeholder={`${memberLabel} suchen…`}
          options={members.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }))}
        />
      </div>
      <FormField label="Titel" name="title" required placeholder="z.B. Vereinsfest 2025" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="type">
            Typ
          </label>
          <select
            id="type"
            name="type"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="GAME">Spiel</option>
            <option value="EXTERNAL">Externes Event</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="locationId">
            Standort
          </label>
          <select
            id="locationId"
            name="locationId"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">–</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <FormField label="Datum" name="date" type="date" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Start" name="startTime" type="time" required />
        <FormField label="Ende" name="endTime" type="time" required />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Tätigkeit" name="activityName" required placeholder="Speaker" />
        <FormField
          label="Einsatzbeschrieb"
          name="description"
          required
          placeholder="z.B. Aufbau/Abbau Festwirtschaft"
        />
      </div>
      <FormField
        label="Stunden (Gutschrift)"
        name="creditHours"
        type="number"
        step="0.5"
        min={0}
        required
      />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird hinzugefügt…" : "Stunden hinzufügen"}
      </Button>
    </form>
  );
}
