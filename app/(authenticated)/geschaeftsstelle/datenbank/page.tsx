import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { Card } from "@/components/ui/Card";
import { MemberImportForm } from "./MemberImportForm";
import { ArchiveSeasonForm } from "./ArchiveSeasonForm";

export default async function DatenbankPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const [season, archives] = await Promise.all([
    getCurrentSeason(),
    prisma.seasonArchive.findMany({
      where: q ? { seasonLabel: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { archivedAt: "desc" },
      select: { id: true, seasonLabel: true, archivedAt: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
          Mitglieder importieren
        </h2>
        <p className="mb-3 text-sm text-muted">
          Roster-Export hochladen (Kontakt-ID, Vorname, Nachname, E-Mail, Sollstunden, Team/Stufe).
          Bestehende Mitglieder (gleiche Kontakt-ID) werden aktualisiert, neue angelegt — Logins
          bleiben dabei erhalten. Mitglieder, die in der Datei fehlen, werden automatisch
          deaktiviert (inkl. Login), nicht gelöscht.
        </p>
        <MemberImportForm />
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
          Helferstunden-Export
        </h2>
        <p className="mb-3 text-sm text-muted">
          Jederzeit möglich, unabhängig von der Archivierung — z.B. für einen Zwischenstand. Zwei
          getrennte Dateien, da Nachwuchs und Aktivmannschaften unabhängige Kontakt-ID-Systeme sind.
        </p>
        {season ? (
          <div className="flex flex-col gap-1">
            <a
              href="/api/exports/members-csv?category=NACHWUCHS"
              className="self-start text-sm font-medium text-gold-hover hover:underline"
            >
              Helferstunden Nachwuchs exportieren (CSV, Kontakt-ID;Stunden) →
            </a>
            <a
              href="/api/exports/members-csv?category=AKTIV"
              className="self-start text-sm font-medium text-gold-hover hover:underline"
            >
              Helferstunden Aktive exportieren (CSV, Kontakt-ID;Stunden) →
            </a>
          </div>
        ) : (
          <p className="text-sm text-status-open-text">Keine aktive Saison konfiguriert.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Saison archivieren
        </h2>
        {season ? (
          <ArchiveSeasonForm currentSeasonLabel={season.label} />
        ) : (
          <p className="text-sm text-status-open-text">Keine aktive Saison konfiguriert.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Archivierte Saisons
        </h2>
        <form className="mb-3 flex gap-2" action="/geschaeftsstelle/datenbank">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Saison durchsuchen…"
            className="w-full max-w-sm rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-gold-hover"
          >
            Suchen
          </button>
          {q && (
            <Link
              href="/geschaeftsstelle/datenbank"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text hover:border-navy/40"
            >
              Zurücksetzen
            </Link>
          )}
        </form>
        <div className="flex flex-col">
          {archives.map((a) => (
            <Link
              key={a.id}
              href={`/geschaeftsstelle/datenbank/archiv/${a.id}`}
              className="flex items-center justify-between border-b border-border py-2 text-sm last:border-b-0 hover:text-gold-hover"
            >
              <span>{a.seasonLabel}</span>
              <span className="text-muted">archiviert am {a.archivedAt.toLocaleDateString("de-CH")}</span>
            </Link>
          ))}
          {archives.length === 0 && (
            <p className="text-sm text-muted">
              {q ? "Keine archivierten Saisons gefunden." : "Noch keine archivierten Saisons."}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
