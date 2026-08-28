"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/send";

/**
 * Sends a reminder to Members in the given Stufe(n) (their own ageGroupId,
 * from the roster import — not a Helfereinsatz's restriction). Geschäftsstelle
 * picks any combination and can add Funktionäre; a Stufenleiter is always
 * force-scoped to their own assigned Stufe(n), regardless of what's passed in.
 */
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

  const recipients = new Map<string, { firstName: string; lastName: string; email: string }>();

  if (ageGroupIds.length > 0) {
    const members = await prisma.member.findMany({
      where: { ageGroupId: { in: ageGroupIds }, email: { not: null }, isActive: true },
    });
    for (const m of members) {
      if (m.email) {
        recipients.set(m.id, { firstName: m.firstName, lastName: m.lastName, email: m.email });
      }
    }
  }

  if (role === "GESCHAEFTSSTELLE" && input.includeFunktionaere) {
    const funktionaere = await prisma.user.findMany({
      where: { role: "FUNKTIONAER", isActive: true },
      include: { member: true },
    });
    for (const u of funktionaere) {
      const member = u.member;
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
