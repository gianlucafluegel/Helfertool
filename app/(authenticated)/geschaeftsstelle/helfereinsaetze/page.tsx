import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { Card } from "@/components/ui/Card";
import { CreateGameEventForm } from "./CreateGameEventForm";
import { CreateExternalEventForm } from "./CreateExternalEventForm";
import { ImportForm } from "./ImportForm";

export default async function HelfereinsaetzePage() {
  const [season, locations, members] = await Promise.all([
    getCurrentSeason(),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Helfereinsatz Spiel erfassen
        </h2>
        {season ? (
          <CreateGameEventForm locations={locations} members={members} />
        ) : (
          <p className="text-sm text-status-open-text">Keine aktive Saison konfiguriert.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Helfereinsatz externes Event erfassen
        </h2>
        {season ? (
          <CreateExternalEventForm members={members} />
        ) : (
          <p className="text-sm text-status-open-text">Keine aktive Saison konfiguriert.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
          Helfereinsätze aus Excel importieren (MySIHF)
        </h2>
        <p className="mb-3 text-sm text-muted">
          Spielplan-Export von MySIHF hochladen, Vorschau prüfen (Standort/Team je Zeile
          anpassbar) und importieren. Bereits importierte Spiele (gleiche MySIHF-Spiel-Nr.) werden
          aktualisiert statt doppelt angelegt — bestehende Einsätze/Anmeldungen bleiben erhalten.
        </p>
        <ImportForm />
      </Card>
    </div>
  );
}
