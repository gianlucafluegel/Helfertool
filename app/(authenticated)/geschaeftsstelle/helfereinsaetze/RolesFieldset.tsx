"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type RoleRow = { key: number };

/**
 * Rollen-Abschnitt für die manuellen Erfassungsformulare (Spiel/Externes
 * Event) — dieselben Felder wie "Weitere Rolle hinzufügen" auf der
 * Einsatz-Detailseite (Tätigkeit/Anzahl Plätze/Beschrieb/optional Helfer),
 * aber mehrere davon gleich bei der Erstellung statt einzeln danach. Alle
 * Zeilen teilen sich je ein `name` (z.B. "roleActivityName") — der Server
 * liest sie per `formData.getAll(...)` in Zeilen-Reihenfolge aus. Die
 * Tätigkeit ist ein reines Freitextfeld (keine Tätigkeit ist exklusiv für
 * Funktionäre). Der Beschrieb ist pro Rolle definiert statt geteilt über den
 * ganzen Einsatz (der hat nur noch einen Titel). Anforderungen gibt es nur
 * bei externen Events und bleibt optional (anders als der Beschrieb). Datum/
 * Start/Ende/Anzahl Helferstunden sind für jede Rolle einzeln erfasst — bei
 * allen Event-Typen, da verschiedene Rollen desselben Einsatzes zu völlig
 * unterschiedlichen Zeiten stattfinden können.
 */
export function RolesFieldset({
  members,
  activityPlaceholder = "Speaker",
  showRequirements = false,
}: {
  members: { id: string; firstName: string; lastName: string }[];
  activityPlaceholder?: string;
  showRequirements?: boolean;
}) {
  const [rows, setRows] = useState<RoleRow[]>([{ key: 0 }]);

  function addRow() {
    setRows((prev) => [...prev, { key: (prev.at(-1)?.key ?? -1) + 1 }]);
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
            <label className="text-sm font-medium text-text" htmlFor={`roleActivityName-${row.key}`}>
              Tätigkeit
            </label>
            <input
              id={`roleActivityName-${row.key}`}
              name="roleActivityName"
              required
              placeholder={activityPlaceholder}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
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
              placeholder="1"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text" htmlFor={`roleDescription-${row.key}`}>
              Beschrieb
            </label>
            <input
              id={`roleDescription-${row.key}`}
              name="roleDescription"
              required
              placeholder="z.B. Betreuen der Strafbank"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </div>
          {showRequirements && (
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium text-text"
                htmlFor={`roleRequirements-${row.key}`}
              >
                Anforderungen (optional)
              </label>
              <input
                id={`roleRequirements-${row.key}`}
                name="roleRequirements"
                placeholder="z.B. Über 18"
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text" htmlFor={`roleDate-${row.key}`}>
              Datum
            </label>
            <input
              id={`roleDate-${row.key}`}
              name="roleDate"
              type="date"
              required
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text" htmlFor={`roleStartTime-${row.key}`}>
                Start
              </label>
              <input
                id={`roleStartTime-${row.key}`}
                name="roleStartTime"
                type="time"
                required
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text" htmlFor={`roleEndTime-${row.key}`}>
                Ende
              </label>
              <input
                id={`roleEndTime-${row.key}`}
                name="roleEndTime"
                type="time"
                required
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text" htmlFor={`roleCreditHours-${row.key}`}>
              Anzahl Helferstunden
            </label>
            <input
              id={`roleCreditHours-${row.key}`}
              name="roleCreditHours"
              type="number"
              step="0.5"
              min={0}
              required
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
