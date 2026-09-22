"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatTime } from "@/lib/format";

type ArchivedSignup = {
  id: string;
  helperFirstName: string;
  helperLastName: string;
  payoutType: string;
  status: string;
};

type ArchivedShiftSlot = {
  id: string;
  activityName: string;
  area: string;
  capacity: number;
  creditHours: number;
  startDateTime: string;
  endDateTime: string;
  ageGroupRestrictions: string[];
  signups: ArchivedSignup[];
};

type ArchivedEvent = {
  id: string;
  title: string;
  locationName: string | null;
  date: string;
  isManualEntry: boolean;
  shiftSlots: ArchivedShiftSlot[];
};

export function ArchivedEventsList({ events }: { events: ArchivedEvent[] }) {
  const [query, setQuery] = useState("");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const vonDate = von ? new Date(von) : null;
    // Wie in der Helfereinsätze-Übersicht: "Bis" ist inklusiv, also die
    // exklusive Grenze auf den Beginn des Folgetags legen.
    const bisExclusive = bis ? new Date(new Date(bis).getTime() + 24 * 60 * 60 * 1000) : null;

    return events.filter((e) => {
      if (q && !e.title.toLowerCase().includes(q)) return false;
      const eventDate = new Date(e.date);
      if (vonDate && eventDate < vonDate) return false;
      if (bisExclusive && eventDate >= bisExclusive) return false;
      return true;
    });
  }, [events, query, von, bis]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Titel durchsuchen…"
          className="w-full max-w-sm rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="archiv-von" className="text-xs font-medium text-muted">
            Von
          </label>
          <input
            id="archiv-von"
            type="date"
            value={von}
            onChange={(e) => setVon(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="archiv-bis" className="text-xs font-medium text-muted">
            Bis
          </label>
          <input
            id="archiv-bis"
            type="date"
            value={bis}
            onChange={(e) => setBis(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </div>
        {(query || von || bis) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setVon("");
              setBis("");
            }}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text hover:border-navy/40"
          >
            Zurücksetzen
          </button>
        )}
      </div>
      <div className="flex flex-col gap-4">
        {filtered.map((e) => (
          <div key={e.id} className="border-b border-border pb-4 last:border-b-0">
            <p className="font-medium text-text">{e.title}</p>
            <p className="mb-2 text-xs text-muted">
              {formatDate(new Date(e.date))}
              {e.locationName ? ` · ${e.locationName}` : ""}
            </p>
            <div className="flex flex-col gap-1.5 pl-3">
              {e.shiftSlots.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Badge variant={s.area === "FUNKTIONAER" ? "funktionaer" : "helfer"}>
                      {s.area === "FUNKTIONAER" ? "Funktionär" : "Helfer"}
                    </Badge>
                    <span className="text-text">{s.activityName}</span>
                    {s.ageGroupRestrictions.length > 0 && (
                      <span className="text-xs text-muted">
                        Nur {s.ageGroupRestrictions.join(", ")}
                      </span>
                    )}
                    <span className="text-xs text-muted">
                      {formatTime(new Date(s.startDateTime))}–{formatTime(new Date(s.endDateTime))} Uhr
                      · {s.creditHours} Std.
                    </span>
                  </span>
                  <span className="text-muted">
                    {s.signups.length > 0
                      ? s.signups.map((sg) => `${sg.helperFirstName} ${sg.helperLastName}`).join(", ")
                      : `offen (0/${s.capacity})`}
                  </span>
                </div>
              ))}
              {e.shiftSlots.length === 0 && (
                <p className="text-sm text-muted">Keine Einsätze für dieses Event.</p>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted">
            {events.length === 0 ? "Keine Helfereinsätze in dieser Saison." : "Keine Helfereinsätze gefunden."}
          </p>
        )}
      </div>
    </>
  );
}
