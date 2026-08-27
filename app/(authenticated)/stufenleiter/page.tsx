import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { canManageShiftSlot } from "@/lib/visibility";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function StufenleiterOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  if (!session?.user) return null;

  const assignments = await prisma.stufenleiterAssignment.findMany({
    where: { userId: session.user.id },
  });
  const assignedIds = new Set(assignments.map((a) => a.ageGroupId));

  if (assignments.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Dir ist noch keine Altersstufe zugewiesen. Bitte kontaktiere die Geschäftsstelle.
        </p>
      </Card>
    );
  }

  const season = await getCurrentSeason();
  if (!season) {
    return <p className="text-sm text-muted">Keine aktive Saison konfiguriert.</p>;
  }

  function scopeToAssigned<
    E extends {
      shiftSlots: {
        capacity: number;
        ageGroupRestrictions: { ageGroupId: string }[];
        signups: unknown[];
      }[];
    },
  >(events: E[]) {
    return events
      .map((event) => ({
        event,
        slots: event.shiftSlots.filter((slot) =>
          canManageShiftSlot(
            "STUFENLEITER",
            slot.ageGroupRestrictions.map((r) => r.ageGroupId),
            assignedIds,
          ),
        ),
      }))
      .filter(({ slots }) => slots.length > 0);
  }

  const [statsEventsRaw, listEventsRaw] = await Promise.all([
    prisma.event.findMany({
      where: { seasonId: season.id, deletedAt: null, isManualEntry: false },
      include: {
        shiftSlots: {
          where: { deletedAt: null },
          include: {
            ageGroupRestrictions: true,
            signups: { where: { status: "CONFIRMED" } },
          },
        },
      },
    }),
    prisma.event.findMany({
      where: {
        seasonId: season.id,
        deletedAt: null,
        isManualEntry: false,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        location: true,
        shiftSlots: {
          where: { deletedAt: null },
          include: {
            ageGroupRestrictions: true,
            signups: { where: { status: "CONFIRMED" } },
          },
        },
      },
      orderBy: { startDateTime: "asc" },
    }),
  ]);

  const statsScoped = scopeToAssigned(statsEventsRaw);
  const listScoped = scopeToAssigned(listEventsRaw);

  const gameCount = statsScoped.filter(({ event }) => event.type === "GAME").length;
  const externalCount = statsScoped.filter(({ event }) => event.type === "EXTERNAL").length;
  let filled = 0;
  let open = 0;
  for (const { slots } of statsScoped) {
    for (const s of slots) {
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
          Helfereinsätze suchen
        </h2>
        <form className="flex gap-2" action="/stufenleiter">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Titel oder Beschreibung durchsuchen…"
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
              href="/stufenleiter"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text hover:border-navy/40"
            >
              Zurücksetzen
            </Link>
          )}
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {q ? `Suchergebnisse für "${q}"` : "Alle Helfereinsätze"}
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
              {listScoped.map(({ event, slots }) => {
                const eventOpen = slots.filter((s) => s.signups.length < s.capacity).length;
                const ownAgeGroupId = slots
                  .flatMap((s) => s.ageGroupRestrictions.map((r) => r.ageGroupId))
                  .find((id) => assignedIds.has(id));
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
                        href={`/stufenleiter/${ownAgeGroupId}/${event.id}`}
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
              {listScoped.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted">
                    Keine Helfereinsätze gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
