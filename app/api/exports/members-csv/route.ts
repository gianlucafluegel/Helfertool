import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";

/**
 * Season-end export for the club's accounting workflow: just Kontakt-ID and
 * geleistete Stunden, semicolon-separated — nothing else. This is what gets
 * fed downstream once the season is done, right before archiving.
 */
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
  const lines = members.map((member) => {
    const completedHours = member.signups
      .filter((s) => s.payoutType === "HELFERKONTINGENT" && s.shiftSlot.event.startDateTime < now)
      .reduce((sum, s) => sum + Number(s.shiftSlot.creditHours), 0);
    return `${member.externalContactId ?? ""};${completedHours}`;
  });

  const csv = lines.join("\r\n") + "\r\n";
  const filename = `Helferstunden-${season.label.replace("/", "-")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
