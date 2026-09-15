"use client";

import { useActionState } from "react";
import { createGameEvent } from "@/lib/actions/events";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { RolesFieldset } from "./RolesFieldset";

export function CreateGameEventForm({
  locations,
  members,
  ageGroups,
}: {
  locations: { id: string; name: string }[];
  members: { id: string; firstName: string; lastName: string }[];
  ageGroups: { id: string; name: string }[];
}) {
  const [error, formAction, pending] = useActionState(createGameEvent, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Titel" name="title" required placeholder="U14 · HC Dragon Thun – SC Muster" />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="locationId">
          Standort
        </label>
        <select
          id="locationId"
          name="locationId"
          required
          defaultValue=""
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Bitte wählen…
          </option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="ageGroupId">
          Stufe
        </label>
        <select
          id="ageGroupId"
          name="ageGroupId"
          defaultValue=""
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="">–</option>
          {ageGroups.map((ag) => (
            <option key={ag.id} value={ag.id}>
              {ag.name}
            </option>
          ))}
        </select>
      </div>
      <RolesFieldset members={members} />
      {error && <p className="text-sm text-status-open-text">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Wird erstellt…" : "Helfereinsatz erstellen"}
      </Button>
    </form>
  );
}
