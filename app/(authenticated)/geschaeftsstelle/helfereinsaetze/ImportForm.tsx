"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  parseImportFile,
  commitImport,
  type ImportPreviewState,
  type ImportPreviewRow,
} from "@/lib/actions/import";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const ALL_AGE_GROUPS = "__all__";

export function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportPreviewState, FormData>(
    parseImportFile,
    { status: "idle" },
  );

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-page-bg file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <Button type="submit" disabled={pending} variant="secondary">
          {pending ? "Wird eingelesen…" : "Datei einlesen"}
        </Button>
      </form>

      {state.status === "error" && (
        <p className="text-sm text-status-open-text">{state.message}</p>
      )}

      {state.status === "preview" && (
        <ImportPreviewTable
          key={state.rows.map((r) => r.spielNr).join(",")}
          rows={state.rows}
          locations={state.locations}
          ageGroups={state.ageGroups}
        />
      )}
    </div>
  );
}

function ImportPreviewTable({
  rows,
  locations,
  ageGroups,
}: {
  rows: ImportPreviewRow[];
  locations: { id: string; name: string }[];
  ageGroups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowState, setRowState] = useState(() =>
    rows.map((row) => ({
      ...row,
      selected: true,
      locationId: row.locationGuessId,
      ageGroupId: row.ageGroupGuessId,
    })),
  );

  const selectedCount = rowState.filter((r) => r.selected).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="py-2 pr-2" />
              <th className="py-2 pr-2">Datum</th>
              <th className="py-2 pr-2">Titel</th>
              <th className="py-2 pr-2">Standort</th>
              <th className="py-2 pr-2">Stufe</th>
              <th className="py-2 pr-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rowState.map((row, i) => (
              <tr key={row.spielNr} className="border-b border-border last:border-b-0">
                <td className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) =>
                      setRowState((prev) =>
                        prev.map((r, j) =>
                          j === i ? { ...r, selected: e.target.checked } : r,
                        ),
                      )
                    }
                  />
                </td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  {new Date(row.startDateTimeIso).toLocaleString("de-CH", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-2 pr-2">{row.title}</td>
                <td className="py-2 pr-2">
                  <select
                    value={row.locationId ?? ""}
                    onChange={(e) =>
                      setRowState((prev) =>
                        prev.map((r, j) =>
                          j === i ? { ...r, locationId: e.target.value || null } : r,
                        ),
                      )
                    }
                    className="rounded border border-border bg-white px-2 py-1 text-xs"
                  >
                    <option value="">– nicht zugeordnet –</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <select
                    value={row.ageGroupId ?? ALL_AGE_GROUPS}
                    onChange={(e) =>
                      setRowState((prev) =>
                        prev.map((r, j) =>
                          j === i
                            ? {
                                ...r,
                                ageGroupId:
                                  e.target.value === ALL_AGE_GROUPS ? null : e.target.value,
                              }
                            : r,
                        ),
                      )
                    }
                    className="rounded border border-border bg-white px-2 py-1 text-xs"
                  >
                    <option value={ALL_AGE_GROUPS}>Alle Stufen</option>
                    {ageGroups.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <div className="flex flex-wrap gap-1">
                    {row.cancelled && <Badge variant="open">abgesagt</Badge>}
                    {row.hasProbleme && <Badge variant="neutral">⚠ Probleme</Badge>}
                    {row.willUpdate && <Badge variant="neutral">Update</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-status-open-text">{error}</p>}
      {result && <p className="text-sm text-status-filled-text">{result}</p>}

      <Button
        type="button"
        disabled={pending || selectedCount === 0}
        className="self-start"
        onClick={() => {
          setError(null);
          setResult(null);
          startTransition(async () => {
            const res = await commitImport(
              rowState
                .filter((r) => r.selected)
                .map((r) => ({
                  spielNr: r.spielNr,
                  title: r.title,
                  description: r.description,
                  startDateTimeIso: r.startDateTimeIso,
                  cancelled: r.cancelled,
                  locationId: r.locationId,
                  ageGroupId: r.ageGroupId,
                })),
            );
            if (res.error) {
              setError(res.error);
            } else {
              setResult(`${res.created ?? 0} erstellt, ${res.updated ?? 0} aktualisiert.`);
              router.refresh();
            }
          });
        }}
      >
        {pending ? "Wird importiert…" : `Ausgewählte importieren (${selectedCount})`}
      </Button>
    </div>
  );
}
