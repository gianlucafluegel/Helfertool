import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isShiftSlotVisible } from "@/lib/visibility";
import { EventCard } from "@/components/shifts/EventCard";

export default async function EinsaetzeEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const event = await prisma.event.findUnique({
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
        orderBy: { startDateTime: "asc" },
      },
    },
  });

  if (!event || event.deletedAt || event.isManualEntry) notFound();

  const activeMember = session.user.member;
  const visibleSlots = event.shiftSlots
    .filter((slot) => isShiftSlotVisible(slot, session.user.role))
    .map((slot) => ({ ...slot, creditHours: Number(slot.creditHours) }));

  if (visibleSlots.length === 0) notFound();

  // Structure matches the list page exactly — Funktionär (and above) see who's
  // doing an already-filled Einsatz by clicking into it ("Ansehen"), not via
  // names shown inline in the list.
  const canViewOccupant = session.user.role !== "MITGLIED";

  return (
    <div className="flex flex-col gap-5">
      <Link href="/einsaetze" className="text-sm font-medium text-muted hover:text-navy">
        ← Zurück zu den Einsätzen
      </Link>

      <EventCard
        title={event.title}
        locationName={event.location?.name ?? event.locationText ?? null}
        shiftSlots={visibleSlots}
        showOccupant={false}
        activeMemberId={activeMember?.id ?? null}
        allowSelfCancel
        canViewOccupant={canViewOccupant}
      />
    </div>
  );
}
