import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { Card } from "@/components/ui/Card";
import { AdminEventCard } from "@/components/shifts/AdminEventCard";
import { ReminderForm } from "@/components/reminders/ReminderForm";

export default async function StufenleiterStufePage({
  params,
}: {
  params: Promise<{ ageGroupId: string }>;
}) {
  const { ageGroupId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const assignment = await prisma.stufenleiterAssignment.findUnique({
    where: { userId_ageGroupId: { userId: session.user.id, ageGroupId } },
    include: { ageGroup: true },
  });
  if (!assignment) notFound();

  const season = await getCurrentSeason();
  if (!season) {
    return <p className="text-sm text-muted">Keine aktive Saison konfiguriert.</p>;
  }

  const events = await prisma.event.findMany({
    where: {
      seasonId: season.id,
      deletedAt: null,
      shiftSlots: { some: { deletedAt: null, ageGroupRestrictions: { some: { ageGroupId } } } },
    },
    include: {
      location: true,
      shiftSlots: {
        where: { deletedAt: null, ageGroupRestrictions: { some: { ageGroupId } } },
        include: {
          activity: true,
          ageGroupRestrictions: { include: { ageGroup: true } },
          signups: { where: { status: "CONFIRMED" } },
        },
      },
    },
    orderBy: { startDateTime: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-navy">Team {assignment.ageGroup.name}</h1>
        <p className="text-sm text-muted">Saison {season.label}</p>
      </div>

      <Card>
        <p className="mb-2 text-sm font-medium text-text">
          Reminder an Team {assignment.ageGroup.name} senden
        </p>
        <ReminderForm
          availableAgeGroups={[{ id: ageGroupId, name: assignment.ageGroup.name }]}
          lockedAgeGroupIds={[ageGroupId]}
        />
      </Card>

      {events.length === 0 && (
        <p className="text-sm text-muted">Keine Helfereinsätze für dieses Team gefunden.</p>
      )}

      {events.map((event) => (
        <AdminEventCard
          key={event.id}
          eventId={event.id}
          title={event.title}
          startDateTime={event.startDateTime}
          locationName={event.location?.name ?? null}
          shiftSlots={event.shiftSlots}
          detailHrefBase={`/stufenleiter/${ageGroupId}`}
        />
      ))}
    </div>
  );
}
