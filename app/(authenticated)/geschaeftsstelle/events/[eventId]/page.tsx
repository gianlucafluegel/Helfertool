import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { AdminShiftSlotRow } from "@/components/shifts/AdminShiftSlotRow";
import { EventEditForm } from "./EventEditForm";
import { AddShiftSlotForm } from "./AddShiftSlotForm";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [event, locations, activities, ageGroups] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
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
    }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.activity.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.ageGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!event || event.deletedAt) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h1 className="mb-3 text-base font-semibold text-text">Event bearbeiten</h1>
        <EventEditForm
          eventId={event.id}
          title={event.title}
          opponent={event.opponent ?? ""}
          locationId={event.locationId ?? ""}
          startDateTime={event.startDateTime}
          status={event.status}
          locations={locations}
        />
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Einsätze</h2>
          <a
            href={`/api/exports/event/${event.id}`}
            className="text-xs font-medium text-gold-hover hover:underline"
          >
            Liste herunterladen
          </a>
        </div>
        <div className="mb-4">
          {event.shiftSlots.map((slot) => (
            <AdminShiftSlotRow key={slot.id} slot={slot} eventId={event.id} />
          ))}
          {event.shiftSlots.length === 0 && (
            <p className="text-sm text-muted">Noch keine Einsätze für dieses Event.</p>
          )}
        </div>
        <AddShiftSlotForm eventId={event.id} activities={activities} ageGroups={ageGroups} />
      </Card>
    </div>
  );
}
