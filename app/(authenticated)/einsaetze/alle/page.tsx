import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { EventCard } from "@/components/shifts/EventCard";

export default async function AlleEinsaetzePage() {
  const session = await auth();
  if (!session?.user) return null;

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
        include: {
          activity: true,
          ageGroupRestrictions: { include: { ageGroup: true } },
          signups: true,
        },
      },
    },
    orderBy: { startDateTime: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold text-navy">Alle Einsätze – wer macht was</h1>
      {events.length === 0 && <p className="text-sm text-muted">Keine Einsätze vorhanden.</p>}
      {events.map((event) => (
        <EventCard
          key={event.id}
          title={event.title}
          startDateTime={event.startDateTime}
          locationName={event.location?.name ?? null}
          shiftSlots={event.shiftSlots.map((slot) => ({
            ...slot,
            signups: slot.signups.filter((s) => s.status === "CONFIRMED"),
          }))}
          showOccupant
          activeMemberId={null}
          allowSelfCancel={false}
          readOnly
        />
      ))}
    </div>
  );
}
