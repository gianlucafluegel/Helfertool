import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { Card } from "@/components/ui/Card";
import { CreateEventForm } from "./CreateEventForm";

export default async function HelfereinsaetzePage() {
  const season = await getCurrentSeason();
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const events = season
    ? await prisma.event.findMany({
        where: { seasonId: season.id, deletedAt: null },
        include: { location: true },
        orderBy: { startDateTime: "asc" },
      })
    : [];

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Helfereinsatz manuell erfassen
        </h2>
        {season ? (
          <CreateEventForm seasonId={season.id} locations={locations} />
        ) : (
          <p className="text-sm text-status-open-text">Keine aktive Saison konfiguriert.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Alle Helfereinsätze
        </h2>
        <div className="flex flex-col">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/geschaeftsstelle/helfereinsaetze/${event.id}`}
              className="flex items-center justify-between border-b border-border py-2 text-sm last:border-b-0 hover:text-gold-hover"
            >
              <span>{event.title}</span>
              <span className="text-muted">
                {event.startDateTime.toLocaleDateString("de-CH")}
                {event.location ? ` · ${event.location.name}` : ""}
              </span>
            </Link>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-muted">Noch keine Helfereinsätze.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
