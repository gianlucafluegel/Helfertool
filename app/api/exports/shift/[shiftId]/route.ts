import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageShiftSlot } from "@/lib/visibility";
import { toCsv } from "@/lib/export/csv";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shiftId: string }> },
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "GESCHAEFTSSTELLE" && session.user.role !== "STUFENLEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { shiftId } = await params;
  const shiftSlot = await prisma.shiftSlot.findUnique({
    where: { id: shiftId },
    include: {
      activity: true,
      event: true,
      ageGroupRestrictions: true,
      signups: { where: { status: "CONFIRMED" } },
    },
  });

  if (!shiftSlot) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  if (session.user.role === "STUFENLEITER") {
    const assignments = await prisma.stufenleiterAssignment.findMany({
      where: { userId: session.user.id },
      select: { ageGroupId: true },
    });
    const allowed = new Set(assignments.map((a) => a.ageGroupId));
    if (
      !canManageShiftSlot(
        "STUFENLEITER",
        shiftSlot.ageGroupRestrictions.map((r) => r.ageGroupId),
        allowed,
      )
    ) {
      return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
    }
  }

  const csv = toCsv(
    ["Vorname", "Name", "E-Mail", "Telefon", "Entschädigung"],
    shiftSlot.signups.map((s) => [
      s.helperFirstName,
      s.helperLastName,
      s.helperEmail,
      s.helperPhone ?? "",
      s.payoutType,
    ]),
  );

  const filename = `${shiftSlot.event.title}-${shiftSlot.activity.name}.csv`.replace(/[^\w.-]+/g, "_");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
