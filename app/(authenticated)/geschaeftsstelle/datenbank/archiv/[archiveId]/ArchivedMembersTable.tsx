"use client";

import { useMemo, useState } from "react";

type ArchivedMember = {
  id: string;
  externalContactId: string | null;
  firstName: string;
  lastName: string;
  ageGroupName: string | null;
  targetHours: number;
  completedHours: number;
};

export function ArchivedMembersTable({ members }: { members: ArchivedMember[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q));
  }, [members, query]);

  return (
    <>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Mitglied suchen…"
        className="mb-3 w-full max-w-xs rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="py-2 pr-3">Kontakt-ID</th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Team</th>
              <th className="py-2 pr-3">Soll-Std.</th>
              <th className="py-2 pr-3">Geleistet</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-b-0">
                <td className="py-2 pr-3">{m.externalContactId ?? "–"}</td>
                <td className="py-2 pr-3">
                  {m.firstName} {m.lastName}
                </td>
                <td className="py-2 pr-3">{m.ageGroupName ?? "–"}</td>
                <td className="py-2 pr-3">{m.targetHours}</td>
                <td className="py-2 pr-3">{m.completedHours}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted">
                  {members.length === 0
                    ? "Keine Mitglieder in dieser Saison."
                    : "Keine Mitglieder gefunden."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
