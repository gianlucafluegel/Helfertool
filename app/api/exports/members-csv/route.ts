import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import type { MemberCategory } from "@/generated/prisma/enums";

/**
 * Season-end export for the club's accounting workflow: just Kontakt-ID and
 * geleistete Stunden, semicolon-separated — nothing else. This is what gets
 * fed downstream once the season is done, right before archiving.
 *
 * Nachwuchs and Aktivmannschaften are separate downstream systems with their
 * own independent Kontakt-ID numbering, so the export is always split by
 * Kategorie (?category=NACHWUCHS|AKTIV) — a combined export could otherwise
 * contain two different people under the same Kontakt-ID.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as MemberCategory | null;
  if (category !== "NACHWUCHS" && category !== "AKTIV") {
    return NextResponse.json(
      { error: "Ungültige oder fehlende Kategorie (erwartet: NACHWUCHS oder AKTIV)." },
      { status: 400 },
    );
  }

  const season = await getCurrentSeason();
  if (!season) {
    return NextResponse.json({ error: "Keine aktive Saison konfiguriert." }, { status: 400 });
  }

  const members = await prisma.member.findMany({
    where: { category },
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
  const categoryLabel = category === "NACHWUCHS" ? "Nachwuchs" : "Aktive";
  const filename = `Helferstunden-${categoryLabel}-${season.label.replace("/", "-")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
