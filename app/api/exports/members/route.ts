import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";

export async function GET() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const season = await getCurrentSeason();
  if (!season) {
    return NextResponse.json({ error: "Keine aktive Saison konfiguriert." }, { status: 400 });
  }

  const members = await prisma.member.findMany({
    include: {
      signups: {
        where: { status: "CONFIRMED" },
        include: { shiftSlot: { include: { event: true } } },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const now = new Date();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Mitglieder");
  sheet.columns = [
    { header: "Kontakt-ID", key: "contactId", width: 16 },
    { header: "Vorname", key: "firstName", width: 16 },
    { header: "Nachname", key: "lastName", width: 16 },
    { header: "Alter", key: "age", width: 10 },
    { header: "E-Mail", key: "email", width: 28 },
    { header: "Soll-Stunden", key: "targetHours", width: 14 },
    { header: "Geleistete Stunden", key: "completedHours", width: 18 },
    { header: "Offene Stunden", key: "openHours", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const member of members) {
    const targetHours = Number(member.targetHours);
    const completedHours = member.signups
      .filter((s) => s.payoutType === "HELFERKONTINGENT" && s.shiftSlot.event.startDateTime < now)
      .reduce((sum, s) => sum + Number(s.shiftSlot.creditHours), 0);

    sheet.addRow({
      contactId: member.externalContactId ?? "",
      firstName: member.firstName,
      lastName: member.lastName,
      age: member.age ?? "",
      email: member.email ?? "",
      targetHours,
      completedHours,
      openHours: Math.max(0, targetHours - completedHours),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Mitglieder-Helferstunden-${season.label.replace("/", "-")}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
