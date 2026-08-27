"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addManualHours } from "@/lib/actions/members";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export function ManualHoursForm({
  members,
  locations,
  activities,
  memberLabel = "Mitglied",
  defaultArea = "HELFER",
}: {
  members: { id: string; firstName: string; lastName: string }[];
  locations: { id: string; name: string }[];
  activities: { id: string; name: string }[];
  /** Overrides the "Mitglied" wording, e.g. "Funktionär" on that section. */
  memberLabel?: string;
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
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="description">
          Beschreibung
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={2}
          placeholder="z.B. Aufbau/Abbau Festwirtschaft"
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
      </div>
      <FormField label="Datum/Zeit" name="startDateTime" type="datetime-local" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="activityId">
            Tätigkeit
          </label>
          <select
            id="activityId"
            name="activityId"
            required
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="area">
            Bereich
          </label>
          <select
            id="area"
            name="area"
            defaultValue={defaultArea}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="HELFER">Helfer</option>
            <option value="FUNKTIONAER">Funktionär</option>
          </select>
        </div>
      </div>
      <FormField
        label="Stunden (Gutschrift)"
        name="creditHours"
        type="number"
        step="0.5"
        min={0}
        required
      />
      <FormField label="Notiz (optional)" name="notes" />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird hinzugefügt…" : "Stunden hinzufügen"}
      </Button>
    </form>
  );
}
