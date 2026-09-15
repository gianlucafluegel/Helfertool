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

  // ShiftSlot-rooted statt Event-rooted, da die Zeit jetzt auf der Rolle
  // lebt — Prisma kann orderBy nicht relations-aggregiert auf einer
  // to-many-Relation anwenden. Wird unten per Event-ID gruppiert.
  const shiftSlots = await prisma.shiftSlot.findMany({
    where: {
      deletedAt: null,
      ageGroupRestrictions: { some: { ageGroupId } },
      event: { seasonId: season.id, deletedAt: null },
    },
    include: {
      event: { include: { location: true } },
      activity: true,
      ageGroupRestrictions: { include: { ageGroup: true } },
      signups: { where: { status: "CONFIRMED" } },
    },
    orderBy: { startDateTime: "asc" },
  });

  const grouped = new Map<
    string,
    { event: (typeof shiftSlots)[number]["event"]; slots: typeof shiftSlots }
  >();
  for (const slot of shiftSlots) {
    const existing = grouped.get(slot.event.id);
    if (existing) existing.slots.push(slot);
    else grouped.set(slot.event.id, { event: slot.event, slots: [slot] });
  }
  const events = [...grouped.values()];

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

      {events.map(({ event, slots }) => (
        <AdminEventCard
          key={event.id}
          eventId={event.id}
          title={event.title}
          locationName={event.location?.name ?? event.locationText ?? null}
          shiftSlots={slots.map((s) => ({ ...s, creditHours: Number(s.creditHours) }))}
          detailHrefBase={`/stufenleiter/${ageGroupId}`}
        />
      ))}
    </div>
  );
}
