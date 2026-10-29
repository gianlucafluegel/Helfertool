"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/send";
import { getCurrentSeason } from "@/lib/season";
import { formatDate, formatTime } from "@/lib/format";
import { DEFAULT_REMINDER_BODY, LEGACY_REMINDER_BODY } from "@/lib/mail/reminder-template";

type OpenSlot = {
  eventId: string;
  eventTitle: string;
  locationName: string | null;
  area: "HELFER" | "FUNKTIONAER";
  ageGroupIds: string[];
  activityName: string;
  startDateTime: Date;
  endDateTime: Date;
  openCount: number;
  capacity: number;
};

/** Zukünftige, noch nicht volle Rollen der aktuellen Saison (ohne abgesagte Einsätze). */
async function loadOpenSlots(seasonId: string): Promise<OpenSlot[]> {
  const slots = await prisma.shiftSlot.findMany({
    where: {
      deletedAt: null,
      startDateTime: { gte: new Date() },
      event: { seasonId, deletedAt: null, isManualEntry: false, status: { not: "CANCELLED" } },
    },
    include: {
      activity: true,
      ageGroupRestrictions: true,
      event: { include: { location: true } },
      signups: { where: { status: "CONFIRMED" } },
    },
    orderBy: { startDateTime: "asc" },
  });

  return slots
    .filter((s) => s.signups.length < s.capacity)
    .map((s) => ({
      eventId: s.eventId,
      eventTitle: s.event.title,
      locationName: s.event.location?.name ?? s.event.locationText ?? null,
      area: s.area,
      ageGroupIds: s.ageGroupRestrictions.map((r) => r.ageGroupId),
      activityName: s.activity.name,
      startDateTime: s.startDateTime,
      endDateTime: s.endDateTime,
      openCount: s.capacity - s.signups.length,
      capacity: s.capacity,
    }));
}

/** Gruppiert nach Einsatz (in Reihenfolge des frühesten Slots) als Klartext-Liste für die Mail. */
function formatSlotList(slots: OpenSlot[]): string {
  const byEvent = new Map<string, OpenSlot[]>();
  for (const slot of slots) {
    const list = byEvent.get(slot.eventId) ?? [];
    list.push(slot);
    byEvent.set(slot.eventId, list);
  }

  return [...byEvent.values()]
    .map((eventSlots) => {
      const first = eventSlots[0];
      const header = `${first.eventTitle} – ${formatDate(first.startDateTime)}${
        first.locationName ? `, ${first.locationName}` : ""
      }`;
      const lines = eventSlots.map(
        (s) =>
          `  • ${s.activityName} (${formatTime(s.startDateTime)}–${formatTime(s.endDateTime)} Uhr): ${
            s.openCount
          } von ${s.capacity} ${s.capacity === 1 ? "Platz" : "Plätzen"} offen`,
      );
      return [header, ...lines].join("\n");
    })
    .join("\n\n");
}

/**
 * Sends one reminder mail per recipient, listing all still-unfilled upcoming
 * Einsätze relevant to them (never one mail per Einsatz). Members in the
 * given Stufe(n) see open Helfer-Rollen restricted to one of those Stufen or
 * unrestricted; Funktionäre see every open Rolle. A Stufenleiter is
 * force-scoped to their own assigned Stufe(n) and only their own restricted
 * Rollen. If nothing is open, no mail goes out at all.
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

  const season = await getCurrentSeason();
  if (!season) return { error: "Keine aktive Saison konfiguriert." };

  const template = await prisma.mailTemplate.findUnique({ where: { key: "REMINDER_UNFILLED" } });
  if (!template) return { error: "Mail-Vorlage für Reminder nicht gefunden." };
  if (template.bodyText === LEGACY_REMINDER_BODY) {
    await prisma.mailTemplate.update({
      where: { key: "REMINDER_UNFILLED" },
      data: { bodyText: DEFAULT_REMINDER_BODY },
    });
  } else if (!template.bodyText.includes("{{einsaetze}}")) {
    return {
      error:
        "Die Mail-Vorlage „Reminder für offene Einsätze“ enthält den Platzhalter {{einsaetze}} nicht. Bitte unter Mail-Vorlagen ergänzen.",
    };
  }

  const openSlots = await loadOpenSlots(season.id);

  const memberSlots = openSlots.filter((s) => {
    if (s.area !== "HELFER") return false;
    if (role === "STUFENLEITER") return s.ageGroupIds.some((id) => ageGroupIds.includes(id));
    return s.ageGroupIds.length === 0 || s.ageGroupIds.some((id) => ageGroupIds.includes(id));
  });
  const funktionaerSlots = openSlots;

  const recipients = new Map<
    string,
    { firstName: string; lastName: string; email: string; list: string }
  >();

  if (ageGroupIds.length > 0 && memberSlots.length > 0) {
    const list = formatSlotList(memberSlots);
    const members = await prisma.member.findMany({
      where: { ageGroupId: { in: ageGroupIds }, email: { not: null }, isActive: true },
    });
    for (const m of members) {
      if (m.email) {
        recipients.set(m.id, { firstName: m.firstName, lastName: m.lastName, email: m.email, list });
      }
    }
  }

  if (role === "GESCHAEFTSSTELLE" && input.includeFunktionaere && funktionaerSlots.length > 0) {
    const list = formatSlotList(funktionaerSlots);
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
          list,
        });
      }
    }
  }

  if (recipients.size === 0) {
    return {
      error:
        memberSlots.length === 0 && (!input.includeFunktionaere || funktionaerSlots.length === 0)
          ? "Keine offenen Einsätze — es wurde keine Erinnerung gesendet."
          : "Keine Empfänger mit E-Mail-Adresse gefunden.",
    };
  }

  const link = `${process.env.NEXTAUTH_URL ?? ""}/einsaetze`;

  let sent = 0;
  for (const recipient of recipients.values()) {
    await sendMail("REMINDER_UNFILLED", recipient.email, {
      vorname: recipient.firstName,
      nachname: recipient.lastName,
      einsaetze: recipient.list,
      link,
    });
    sent += 1;
  }

  return { sent };
}
