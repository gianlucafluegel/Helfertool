import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { AdminShiftSlotRow } from "@/components/shifts/AdminShiftSlotRow";
import { EventEditForm } from "@/components/shifts/EventEditForm";

export default async function StufenleiterEventDetailPage({
  params,
}: {
  params: Promise<{ ageGroupId: string; eventId: string }>;
}) {
  const { ageGroupId, eventId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const assignment = await prisma.stufenleiterAssignment.findUnique({
    where: { userId_ageGroupId: { userId: session.user.id, ageGroupId } },
    include: { ageGroup: true },
  });
  if (!assignment) notFound();

  const [event, locations, members] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
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
    }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  if (!event || event.deletedAt || event.shiftSlots.length === 0) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/stufenleiter/${ageGroupId}`}
        className="text-sm font-medium text-muted hover:text-navy"
      >
        ← Zurück zu Team {assignment.ageGroup.name}
      </Link>

      <Card>
        <h1 className="mb-3 text-base font-semibold text-text">Helfereinsatz bearbeiten</h1>
        <EventEditForm
          eventId={event.id}
          type={event.type}
          title={event.title}
          description={event.description}
          locationId={event.locationId ?? ""}
          locationText={event.locationText ?? ""}
          requirements={event.requirements ?? ""}
          startDateTime={event.startDateTime}
          endDateTime={event.endDateTime}
          status={event.status}
          locations={locations}
          canDelete={false}
        />
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Rollen</h2>
          <a
            href={`/api/exports/event/${event.id}`}
            className="text-xs font-medium text-gold-hover hover:underline"
          >
            Liste herunterladen
          </a>
        </div>
        {event.shiftSlots.map((slot) => (
          <AdminShiftSlotRow key={slot.id} slot={slot} members={members} />
        ))}
      </Card>
    </div>
  );
}
