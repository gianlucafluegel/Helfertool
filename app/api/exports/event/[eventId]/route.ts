import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageShiftSlot } from "@/lib/visibility";
import { requiresWristbandPickupChoice } from "@/lib/rules/signup-rules";
import { buildHelferlisteExcel } from "@/lib/export/helferlisteExcel";

const WRISTBAND_LABELS: Record<string, string> = {
  GESCHAEFTSSTELLE: "Geschäftsstelle",
  TRAINING: "Training",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "GESCHAEFTSSTELLE" && session.user.role !== "STUFENLEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      location: true,
      shiftSlots: {
        include: {
          activity: true,
          ageGroupRestrictions: true,
          signups: { where: { status: "CONFIRMED" } },
        },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  let allowedAgeGroups: Set<string> | null = null;
  if (session.user.role === "STUFENLEITER") {
    const assignments = await prisma.stufenleiterAssignment.findMany({
      where: { userId: session.user.id },
      select: { ageGroupId: true },
    });
    allowedAgeGroups = new Set(assignments.map((a) => a.ageGroupId));
  }

  const visibleSlots = event.shiftSlots.filter((slot) =>
    allowedAgeGroups
      ? canManageShiftSlot(
          "STUFENLEITER",
          slot.ageGroupRestrictions.map((r) => r.ageGroupId),
          allowedAgeGroups,
        )
      : true,
  );

  const filenameBase = event.title.replace(/[^\w.-]+/g, "_");
  const includeWristbandColumn = requiresWristbandPickupChoice(event.title);

  const buffer = await buildHelferlisteExcel({
    title: event.title,
    locationName: event.location?.name ?? event.locationText,
    includeWristbandColumn,
    rows: visibleSlots.flatMap((slot) =>
      slot.signups.map((s) => ({
        vorname: s.helperFirstName,
        nachname: s.helperLastName,
        email: s.helperEmail,
        telefon: s.helperPhone ?? "",
        taetigkeit: slot.activity.name,
        stufe: s.ageGroupSnapshot,
        creditHours: Number(slot.creditHours),
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        armbandAbholen: s.wristbandPickup ? WRISTBAND_LABELS[s.wristbandPickup] : null,
      })),
    ),
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
    },
  });
}
