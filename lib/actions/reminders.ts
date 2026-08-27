"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/send";

/**
 * Sends a reminder to every Member with an email address. Members no longer
 * carry a Stufe of their own (only a Helfereinsatz does), so there's no way
 * to scope a reminder to "a Stufe's members" anymore — Geschäftsstelle and
 * Stufenleiter both just broadcast to the whole active roster.
 */
export async function sendReminders(): Promise<{ error?: string; sent?: number }> {
  const session = await auth();
  if (!session?.user) return { error: "Bitte melde dich an." };

  const role = session.user.role;
  if (role !== "GESCHAEFTSSTELLE" && role !== "STUFENLEITER") {
    return { error: "Keine Berechtigung." };
  }

  const members = await prisma.member.findMany({ where: { email: { not: null } } });

  let sent = 0;
  for (const member of members) {
    if (!member.email) continue;
    await sendMail("REMINDER_UNFILLED", member.email, {
      vorname: member.firstName,
      nachname: member.lastName,
      event: "verschiedene Einsätze",
      datum: "",
      standort: "",
    });
    sent += 1;
  }

  return { sent };
}
