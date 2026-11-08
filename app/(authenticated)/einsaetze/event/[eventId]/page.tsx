import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isShiftSlotVisible, isSlotInViewerScope } from "@/lib/visibility";
import { getViewerCategories } from "@/lib/viewer-scope";
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
  const viewerCategories = await getViewerCategories(session.user);
  const visibleSlots = event.shiftSlots
    .filter(
      (slot) =>
        isShiftSlotVisible(slot, session.user.role) &&
        isSlotInViewerScope(slot, event.type, viewerCategories),
    )
    .map((slot) => ({ ...slot, creditHours: Number(slot.creditHours) }));

  if (visibleSlots.length === 0) notFound();

  // Stufenleiter/Geschäftsstelle see who's doing an already-filled Einsatz by
  // clicking into it ("Ansehen"). Funktionäre can't sign up at all — they get
  // a read-only view with every helper's name and contact details inline.
  const isFunktionaer = session.user.role === "FUNKTIONAER";
  const canViewOccupant = session.user.role !== "MITGLIED" && !isFunktionaer;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/einsaetze" className="text-sm font-medium text-muted hover:text-navy">
        ← Zurück zu den Einsätzen
      </Link>

      <EventCard
        title={event.title}
        date={event.date}
        locationName={event.location?.name ?? event.locationText ?? null}
        shiftSlots={visibleSlots}
        showOccupant={isFunktionaer}
        activeMemberId={activeMember?.id ?? null}
        allowSelfCancel={!isFunktionaer}
        readOnly={isFunktionaer}
        canViewOccupant={canViewOccupant}
      />
    </div>
  );
}
