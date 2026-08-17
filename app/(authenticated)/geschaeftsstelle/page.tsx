import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function GeschaeftsstelleOverviewPage() {
  const season = await getCurrentSeason();
  if (!season) {
    return <p className="text-sm text-muted">Keine aktive Saison konfiguriert.</p>;
  }

  const events = await prisma.event.findMany({
    where: { seasonId: season.id, deletedAt: null },
    include: {
      location: true,
      shiftSlots: {
        where: { deletedAt: null },
        include: { signups: { where: { status: "CONFIRMED" } } },
      },
    },
    orderBy: { startDateTime: "asc" },
  });

  const gameCount = events.filter((e) => e.type === "GAME").length;
  const externalCount = events.filter((e) => e.type === "EXTERNAL").length;
  let filled = 0;
  let open = 0;
  for (const e of events) {
    for (const s of e.shiftSlots) {
      if (s.signups.length >= s.capacity) filled += 1;
      else open += 1;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-2xl font-bold text-navy">{gameCount}</p>
          <p className="text-xs text-muted">Spiele</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-navy">{externalCount}</p>
          <p className="text-xs text-muted">Externe Events</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-status-filled-text">{filled}</p>
          <p className="text-xs text-muted">Rollen besetzt</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-status-open-text">{open}</p>
          <p className="text-xs text-muted">Rollen offen</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Alle Events
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="py-2 pr-3">Datum</th>
                <th className="py-2 pr-3">Titel</th>
                <th className="py-2 pr-3">Standort</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const eventOpen = event.shiftSlots.filter(
                  (s) => s.signups.length < s.capacity,
                ).length;
                return (
                  <tr key={event.id} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {event.startDateTime.toLocaleString("de-CH", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/geschaeftsstelle/events/${event.id}`}
                        className="font-medium text-gold-hover hover:underline"
                      >
                        {event.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{event.location?.name ?? "–"}</td>
                    <td className="py-2 pr-3">
                      {event.status === "CANCELLED" ? (
                        <Badge variant="open">abgesagt</Badge>
                      ) : eventOpen > 0 ? (
                        <Badge variant="open">{eventOpen} offen</Badge>
                      ) : (
                        <Badge variant="filled">besetzt</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
