"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type RoleRow = { key: number; activityId: string };

/**
 * Rollen-Abschnitt für die manuellen Erfassungsformulare (Spiel/Externes
 * Event) — dieselben Felder wie "Weitere Rolle hinzufügen" auf der
 * Einsatz-Detailseite (Tätigkeit/Anzahl Plätze/Notiz/optional Helfer), aber
 * mehrere davon gleich bei der Erstellung statt einzeln danach. Alle Zeilen
 * teilen sich je ein `name` (z.B. "roleActivityId") — der Server liest sie
 * per `formData.getAll(...)` in Zeilen-Reihenfolge aus.
 */
export function RolesFieldset({
  activities,
  members,
}: {
  activities: { id: string; name: string }[];
  members: { id: string; firstName: string; lastName: string }[];
}) {
  const defaultActivityId =
    activities.find((a) => a.name === "Helfer (allgemein)")?.id ?? activities[0]?.id ?? "";
  const [rows, setRows] = useState<RoleRow[]>([{ key: 0, activityId: defaultActivityId }]);

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: (prev.at(-1)?.key ?? -1) + 1, activityId: defaultActivityId },
    ]);
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  const memberOptions = members.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-text">Rollen</p>
      {rows.map((row, i) => (
        <div key={row.key} className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Rolle {i + 1}
            </span>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="text-xs text-status-open-text hover:underline"
              >
                Entfernen
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text" htmlFor={`roleActivityId-${row.key}`}>
              Tätigkeit
            </label>
            <select
              id={`roleActivityId-${row.key}`}
              name="roleActivityId"
              required
              defaultValue={row.activityId}
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
            <label className="text-sm font-medium text-text" htmlFor={`roleCapacity-${row.key}`}>
              Anzahl Plätze
            </label>
            <input
              id={`roleCapacity-${row.key}`}
              name="roleCapacity"
              type="number"
              min={1}
              defaultValue={1}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text" htmlFor={`roleNotes-${row.key}`}>
              Notiz (optional)
            </label>
            <input
              id={`roleNotes-${row.key}`}
              name="roleNotes"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text" htmlFor={`roleMemberId-${row.key}-search`}>
              Helfer (optional)
            </label>
            <SearchableSelect name="roleMemberId" placeholder="Mitglied suchen…" options={memberOptions} />
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={addRow} className="self-start">
        + Weitere Rolle
      </Button>
    </div>
  );
}
