import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageShiftSlot } from "@/lib/visibility";
import { toCsv } from "@/lib/export/csv";

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

  const rows = event.shiftSlots
    .filter((slot) =>
      allowedAgeGroups
        ? canManageShiftSlot(
            "STUFENLEITER",
            slot.ageGroupRestrictions.map((r) => r.ageGroupId),
            allowedAgeGroups,
          )
        : true,
    )
    .flatMap((slot) =>
      slot.signups.map((s) => [
        slot.activity.name,
        s.helperFirstName,
        s.helperLastName,
        s.helperEmail,
        s.helperPhone ?? "",
        s.payoutType,
      ]),
    );

  const csv = toCsv(["Tätigkeit", "Vorname", "Name", "E-Mail", "Telefon", "Entschädigung"], rows);
  const filename = `${event.title}.csv`.replace(/[^\w.-]+/g, "_");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
