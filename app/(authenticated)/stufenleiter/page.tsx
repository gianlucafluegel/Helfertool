import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { canManageShiftSlot } from "@/lib/visibility";
import { Card } from "@/components/ui/Card";
import { AdminEventCard } from "@/components/shifts/AdminEventCard";
import { ReminderForm } from "@/components/reminders/ReminderForm";

export default async function StufenleiterPage() {
  const session = await auth();
  if (!session?.user) return null;

  const assignments = await prisma.stufenleiterAssignment.findMany({
    where: { userId: session.user.id },
    include: { ageGroup: true },
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

  const events = await prisma.event.findMany({
    where: { seasonId: season.id, deletedAt: null },
    include: {
      location: true,
      shiftSlots: {
        where: { deletedAt: null },
        include: {
          activity: true,
          ageGroupRestrictions: { include: { ageGroup: true } },
          signups: { where: { status: "CONFIRMED" } },
        },
      },
    },
    orderBy: { startDateTime: "asc" },
  });

  const scopedEvents = events
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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-navy">
          Stufenadministration – {assignments.map((a) => a.ageGroup.name).join(", ")}
        </h1>
        <p className="text-sm text-muted">Saison {season.label}</p>
      </div>

      <Card>
        <p className="mb-2 text-sm font-medium text-text">Reminder an deine Stufe senden</p>
        <ReminderForm
          availableAgeGroups={assignments.map((a) => ({ id: a.ageGroupId, name: a.ageGroup.name }))}
          lockedAgeGroupIds={[...assignedIds]}
        />
      </Card>

      {scopedEvents.length === 0 && (
        <p className="text-sm text-muted">Keine Einsätze für deine Stufe(n) gefunden.</p>
      )}

      {scopedEvents.map(({ event, slots }) => (
        <AdminEventCard
          key={event.id}
          eventId={event.id}
          title={event.title}
          startDateTime={event.startDateTime}
          locationName={event.location?.name ?? null}
          shiftSlots={slots}
        />
      ))}
    </div>
  );
}
