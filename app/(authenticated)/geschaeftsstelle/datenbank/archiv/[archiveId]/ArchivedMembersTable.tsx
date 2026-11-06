"use client";

import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatTime } from "@/lib/format";

type ArchivedMember = {
  id: string;
  externalContactId: string | null;
  firstName: string;
  lastName: string;
  ageGroupName: string | null;
  targetHours: number;
  completedHours: number;
};

type ArchivedEvent = {
  id: string;
  title: string;
  date: string;
  isManualEntry: boolean;
  shiftSlots: {
    id: string;
    activityName: string;
    creditHours: number;
    startDateTime: string;
    endDateTime: string;
    signups: {
      id: string;
      memberId?: string;
      helperFirstName: string;
      helperLastName: string;
      status: string;
    }[];
  }[];
};

type MemberEinsatz = {
  key: string;
  title: string;
  date: string;
  start: string;
  end: string;
  activityName: string;
  creditHours: number;
  isManualEntry: boolean;
};

const norm = (s: string) => s.trim().toLowerCase();

export function ArchivedMembersTable({
  members,
  events,
}: {
  members: ArchivedMember[];
  events: ArchivedEvent[];
}) {
  const [query, setQuery] = useState("");
  // Standardmässig sind die Einsätze bei einer Suche aufgeklappt und sonst
  // zugeklappt; ein Klick auf den Namen kehrt das für dieses Mitglied um.
  const [toggled, setToggled] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q));
  }, [members, query]);

  // Ältere Archive speichern keine memberId in den Anmeldungen — dann wird
  // über den Namen der Anmeldung zugeordnet.
  const einsaetzeByMember = useMemo(() => {
    const result = new Map<string, MemberEinsatz[]>();
    for (const m of members) {
      const fullName = norm(`${m.firstName} ${m.lastName}`);
      const list: MemberEinsatz[] = [];
      for (const e of events) {
        for (const s of e.shiftSlots) {
          const mine = s.signups.some(
            (sg) =>
              sg.status === "CONFIRMED" &&
              (sg.memberId
                ? sg.memberId === m.id
                : norm(`${sg.helperFirstName} ${sg.helperLastName}`) === fullName),
          );
          if (mine) {
            list.push({
              key: s.id,
              title: e.title,
              date: e.date,
              start: s.startDateTime,
              end: s.endDateTime,
              activityName: s.activityName,
              creditHours: s.creditHours,
              isManualEntry: e.isManualEntry,
            });
          }
        }
      }
      list.sort((a, b) => a.start.localeCompare(b.start));
      result.set(m.id, list);
    }
    return result;
  }, [members, events]);

  const searching = query.trim() !== "";

  return (
    <>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setToggled(new Set());
        }}
        placeholder="Mitglied suchen…"
        className="mb-1 w-full max-w-xs rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
      <p className="mb-3 text-xs text-muted">
        Nach Namen suchen — die geleisteten Einsätze des Mitglieds werden darunter angezeigt. Ohne
        Suche lassen sie sich per Klick auf den Namen aufklappen.
      </p>
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
            {filtered.map((m) => {
              const open = searching !== toggled.has(m.id);
              const einsaetze = einsaetzeByMember.get(m.id) ?? [];
              return (
                <Fragment key={m.id}>
                  <tr className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-3">{m.externalContactId ?? "–"}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() =>
                          setToggled((prev) => {
                            const next = new Set(prev);
                            if (next.has(m.id)) next.delete(m.id);
                            else next.add(m.id);
                            return next;
                          })
                        }
                        className="font-medium text-gold-hover hover:underline"
                      >
                        {open ? "▾" : "▸"} {m.firstName} {m.lastName}
                      </button>
                    </td>
                    <td className="py-2 pr-3">{m.ageGroupName ?? "–"}</td>
                    <td className="py-2 pr-3">{m.targetHours}</td>
                    <td className="py-2 pr-3">{m.completedHours}</td>
                  </tr>
                  {open && (
                    <tr className="border-b border-border last:border-b-0">
                      <td colSpan={5} className="pb-3 pl-6">
                        {einsaetze.length === 0 ? (
                          <p className="text-sm text-muted">Keine Einsätze in dieser Saison.</p>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {einsaetze.map((e) => (
                              <div
                                key={e.key}
                                className="flex flex-wrap items-center justify-between gap-2"
                              >
                                <span>
                                  <span className="font-medium text-text">{e.title}</span>
                                  <span className="text-muted">
                                    {" · "}
                                    {formatDate(new Date(e.date))}, {formatTime(new Date(e.start))}–
                                    {formatTime(new Date(e.end))} Uhr · {e.activityName}
                                  </span>
                                  {e.isManualEntry && (
                                    <Badge variant="neutral" className="ml-2">
                                      manuell
                                    </Badge>
                                  )}
                                </span>
                                <span className="text-muted">{e.creditHours} Std.</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
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
