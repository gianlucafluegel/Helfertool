"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { sendMail } from "@/lib/mail/send";

export async function sendReminders(input: {
  ageGroupIds: string[];
  includeFunktionaere?: boolean;
}): Promise<{ error?: string; sent?: number }> {
  const session = await auth();
  if (!session?.user) return { error: "Bitte melde dich an." };

  const role = session.user.role;
  if (role !== "GESCHAEFTSSTELLE" && role !== "STUFENLEITER") {
    return { error: "Keine Berechtigung." };
  }

  let ageGroupIds = input.ageGroupIds;

  if (role === "STUFENLEITER") {
    const assignments = await prisma.stufenleiterAssignment.findMany({
      where: { userId: session.user.id },
      select: { ageGroupId: true },
    });
    const allowed = new Set(assignments.map((a) => a.ageGroupId));
    ageGroupIds = ageGroupIds.filter((id) => allowed.has(id));
    if (ageGroupIds.length === 0) ageGroupIds = [...allowed];
  }

  const season = await getCurrentSeason();
  if (!season) return { error: "Keine aktive Saison konfiguriert." };

  const recipients = new Map<string, { firstName: string; lastName: string; email: string }>();

  if (ageGroupIds.length > 0) {
    const memberships = await prisma.seasonMembership.findMany({
      where: { seasonId: season.id, ageGroupId: { in: ageGroupIds }, isActive: true },
      include: { member: true },
    });
    for (const m of memberships) {
      if (m.member.email) {
        recipients.set(m.member.id, {
          firstName: m.member.firstName,
          lastName: m.member.lastName,
          email: m.member.email,
        });
      }
    }
  }

  if (role === "GESCHAEFTSSTELLE" && input.includeFunktionaere) {
    const funktionaere = await prisma.user.findMany({
      where: { role: "FUNKTIONAER", isActive: true },
      include: { memberLinks: { include: { member: true } } },
    });
    for (const u of funktionaere) {
      const member = u.memberLinks.find((l) => l.isPrimary)?.member ?? u.memberLinks[0]?.member;
      const email = member?.email ?? u.email;
      if (email) {
        recipients.set(u.id, {
          firstName: member?.firstName ?? "",
          lastName: member?.lastName ?? "",
          email,
        });
      }
    }
  }

  let sent = 0;
  for (const recipient of recipients.values()) {
    await sendMail("REMINDER_UNFILLED", recipient.email, {
      vorname: recipient.firstName,
      nachname: recipient.lastName,
      event: "verschiedene Einsätze",
      datum: "",
      standort: "",
    });
    sent += 1;
  }

  return { sent };
}
