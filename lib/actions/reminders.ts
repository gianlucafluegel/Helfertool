"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/send";
import { formatDate, formatTime } from "@/lib/format";

export type ReminderScope = "ALL" | "STUFE";

/**
 * Sends a reminder for one single Einsatz (Event), listing its still-open,
 * upcoming Rollen. Geschäftsstelle chooses between all Mitglieder and only
 * the Mitglieder of the Stufe the Einsatz is assigned to; a Stufenleiter can
 * only ever remind the Mitglieder of that Stufe (within their own assigned
 * Stufen). An Einsatz without a Stufe (e.g. every externes Event) always
 * goes to all Mitglieder, ignoring `scope`. Funktionäre, Stufenleiter and
 * the "Externer Helfer" are never recipients.
 */
export async function sendEventReminder(
  eventId: string,
  scope: ReminderScope,
): Promise<{ error?: string; sent?: number }> {
  const session = await auth();
  if (!session?.user) return { error: "Bitte melde dich an." };

  const role = session.user.role;
  if (role !== "GESCHAEFTSSTELLE" && role !== "STUFENLEITER") {
    return { error: "Keine Berechtigung." };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      location: true,
      shiftSlots: {
        where: { deletedAt: null },
        include: {
          activity: true,
          ageGroupRestrictions: true,
          signups: { where: { status: "CONFIRMED" } },
        },
        orderBy: { startDateTime: "asc" },
      },
    },
  });
  if (!event || event.deletedAt || event.isManualEntry) return { error: "Einsatz nicht gefunden." };
  if (event.status === "CANCELLED") return { error: "Dieser Einsatz ist abgesagt." };

  const eventAgeGroupIds = [...new Set(event.shiftSlots.flatMap((s) => s.ageGroupRestrictions.map((r) => r.ageGroupId)))];

  // null = alle Mitglieder, sonst nur diese Stufe(n)
  let recipientAgeGroupIds: string[] | null = null;
  if (role === "STUFENLEITER") {
    const assignments = await prisma.stufenleiterAssignment.findMany({
      where: { userId: session.user.id },
      select: { ageGroupId: true },
    });
    const allowed = new Set(assignments.map((a) => a.ageGroupId));
    recipientAgeGroupIds = eventAgeGroupIds.filter((id) => allowed.has(id));
    if (recipientAgeGroupIds.length === 0) return { error: "Keine Berechtigung." };
  } else if (eventAgeGroupIds.length > 0 && scope === "STUFE") {
    recipientAgeGroupIds = eventAgeGroupIds;
  }

  const now = new Date();
  const openSlots = event.shiftSlots.filter(
    (s) => s.area === "HELFER" && s.startDateTime >= now && s.signups.length < s.capacity,
  );
  if (openSlots.length === 0) {
    return { error: "Keine offenen Rollen — es wurde keine Erinnerung gesendet." };
  }

  const template = await prisma.mailTemplate.findUnique({ where: { key: "REMINDER_UNFILLED" } });
  if (!template) return { error: "Mail-Vorlage für Reminder nicht gefunden." };
  if (!template.bodyText.includes("{{einsaetze}}")) {
    return {
      error:
        "Die Mail-Vorlage „Reminder für offene Einsätze“ enthält den Platzhalter {{einsaetze}} nicht. Bitte unter Mail-Vorlagen ergänzen.",
    };
  }

  const members = await prisma.member.findMany({
    where: {
      isActive: true,
      isExternalHelper: false,
      email: { not: null },
      OR: [{ user: null }, { user: { role: { notIn: ["FUNKTIONAER", "STUFENLEITER"] } } }],
      ...(recipientAgeGroupIds ? { ageGroupId: { in: recipientAgeGroupIds } } : {}),
    },
  });
  if (members.length === 0) return { error: "Keine Empfänger mit E-Mail-Adresse gefunden." };

  const header = `${event.title} – ${formatDate(event.date)}${
    event.location?.name ?? event.locationText ? `, ${event.location?.name ?? event.locationText}` : ""
  }`;
  const list = [
    header,
    ...openSlots.map(
      (s) =>
        `  • ${s.activity.name} (${formatTime(s.startDateTime)}–${formatTime(s.endDateTime)} Uhr): ${
          s.capacity - s.signups.length
        } von ${s.capacity} ${s.capacity === 1 ? "Platz" : "Plätzen"} offen`,
    ),
  ].join("\n");
  const link = `${process.env.NEXTAUTH_URL ?? ""}/einsaetze/event/${event.id}`;

  let sent = 0;
  for (const member of members) {
    if (!member.email) continue;
    await sendMail("REMINDER_UNFILLED", member.email, {
      vorname: member.firstName,
      nachname: member.lastName,
      event: event.title,
      einsaetze: list,
      link,
    });
    sent += 1;
  }

  return { sent };
}
