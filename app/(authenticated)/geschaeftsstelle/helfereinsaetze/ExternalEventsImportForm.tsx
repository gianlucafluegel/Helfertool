"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  parseExternalEventsImportFile,
  commitExternalEventsImport,
  type ExternalEventsImportPreviewState,
  type ExternalEventGroupPreview,
} from "@/lib/actions/external-events-import";
import { Button } from "@/components/ui/Button";
import { formatDate, formatTime } from "@/lib/format";

export function ExternalEventsImportForm() {
  const [state, formAction, pending] = useActionState<ExternalEventsImportPreviewState, FormData>(
    parseExternalEventsImportFile,
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
        <ExternalEventsPreviewTable key={state.groups.map((g) => g.key).join(",")} groups={state.groups} />
      )}
    </div>
  );
}

function ExternalEventsPreviewTable({ groups }: { groups: ExternalEventGroupPreview[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowState, setRowState] = useState(() => groups.map((g) => ({ ...g, selected: true })));

  const selectedCount = rowState.filter((r) => r.selected).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="py-2 pr-2" />
              <th className="py-2 pr-2">Datum</th>
              <th className="py-2 pr-2">Start</th>
              <th className="py-2 pr-2">Ende</th>
              <th className="py-2 pr-2">Std.</th>
              <th className="py-2 pr-2">Titel</th>
              <th className="py-2 pr-2">Ort</th>
              <th className="py-2 pr-2">Rollen</th>
            </tr>
          </thead>
          <tbody>
            {rowState.map((row, i) => (
              <tr key={row.key} className="border-b border-border last:border-b-0">
                <td className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) =>
                      setRowState((prev) =>
                        prev.map((r, j) => (j === i ? { ...r, selected: e.target.checked } : r)),
                      )
                    }
                  />
                </td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  {formatDate(new Date(row.startDateTimeIso))}
                </td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  {formatTime(new Date(row.startDateTimeIso))}
                </td>
                <td className="py-2 pr-2 whitespace-nowrap text-muted">
                  {formatTime(new Date(row.endDateTimeIso))}
                </td>
                <td className="py-2 pr-2 whitespace-nowrap text-muted">{row.creditHours}</td>
                <td className="py-2 pr-2">{row.title}</td>
                <td className="py-2 pr-2 text-muted">{row.locationText}</td>
                <td className="py-2 pr-2 text-muted">{row.roleCount}</td>
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
            const res = await commitExternalEventsImport(rowState.filter((r) => r.selected));
            if (res.error) {
              setError(res.error);
            } else {
              setResult(`${res.created ?? 0} Helfereinsätze erstellt.`);
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
