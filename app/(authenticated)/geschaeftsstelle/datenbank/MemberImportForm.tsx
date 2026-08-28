"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  parseMemberImportFile,
  commitMemberImport,
  type MemberImportPreviewState,
  type MemberImportPreviewRow,
} from "@/lib/actions/member-import";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function MemberImportForm() {
  const [state, formAction, pending] = useActionState<MemberImportPreviewState, FormData>(
    parseMemberImportFile,
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
        <MemberImportPreviewTable
          key={state.rows.map((r) => r.contactId).join(",")}
          rows={state.rows}
          ageGroups={state.ageGroups}
        />
      )}
    </div>
  );
}

const NO_STUFE = "__none__";

function MemberImportPreviewTable({
  rows,
  ageGroups,
}: {
  rows: MemberImportPreviewRow[];
  ageGroups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowState, setRowState] = useState(() =>
    rows.map((row) => ({ ...row, selected: true, ageGroupId: row.ageGroupGuessId })),
  );

  const selectedCount = rowState.filter((r) => r.selected).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="py-2 pr-2" />
              <th className="py-2 pr-2">Kontakt-ID</th>
              <th className="py-2 pr-2">Name</th>
              <th className="py-2 pr-2">E-Mail</th>
              <th className="py-2 pr-2">Stufe</th>
              <th className="py-2 pr-2">Alter</th>
              <th className="py-2 pr-2">Soll-Std.</th>
              <th className="py-2 pr-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rowState.map((row, i) => (
              <tr key={row.contactId} className="border-b border-border last:border-b-0">
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
                <td className="py-2 pr-2 whitespace-nowrap">{row.contactId}</td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  {row.firstName} {row.lastName}
                </td>
                <td className="py-2 pr-2">{row.email || "–"}</td>
                <td className="py-2 pr-2">
                  <select
                    value={row.ageGroupId ?? NO_STUFE}
                    onChange={(e) =>
                      setRowState((prev) =>
                        prev.map((r, j) =>
                          j === i
                            ? { ...r, ageGroupId: e.target.value === NO_STUFE ? null : e.target.value }
                            : r,
                        ),
                      )
                    }
                    className="rounded border border-border bg-white px-2 py-1 text-xs"
                  >
                    <option value={NO_STUFE}>–</option>
                    {ageGroups.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">{row.age ?? "–"}</td>
                <td className="py-2 pr-2">{row.targetHours}</td>
                <td className="py-2 pr-2">
                  {row.willUpdate ? <Badge variant="neutral">Update</Badge> : <Badge variant="filled">neu</Badge>}
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
            const res = await commitMemberImport(rowState.filter((r) => r.selected));
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
