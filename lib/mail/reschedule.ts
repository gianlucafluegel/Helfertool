import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/send";
import { formatDate, formatTime } from "@/lib/format";

export const DEFAULT_RESCHEDULE_SUBJECT = "Verschiebung: Dein Helfereinsatz bei {{event}}";
export const DEFAULT_RESCHEDULE_BODY =
  "Hallo {{vorname}} {{nachname}}\n\n" +
  "Der Einsatz {{event}} ({{taetigkeit}}) in {{standort}}, für den du dich angemeldet hast, wurde verschoben.\n\n" +
  "Bisher: {{altesDatum}}\n" +
  "Neu: {{datum}}\n\n" +
  "Falls du am neuen Termin nicht kannst, melde dich bitte bei der Geschäftsstelle.\n\n" +
  "Sportliche Grüsse\nHC Dragon Thun";

/** Legt die Vorlage an, falls sie (z.B. auf einer bestehenden Datenbank) noch fehlt. */
export async function ensureRescheduleTemplate() {
  await prisma.mailTemplate.upsert({
    where: { key: "EVENT_RESCHEDULED" },
    update: {},
    create: {
      key: "EVENT_RESCHEDULED",
      subject: DEFAULT_RESCHEDULE_SUBJECT,
      bodyText: DEFAULT_RESCHEDULE_BODY,
    },
  });
}

export type SlotTimes = { startDateTime: Date; endDateTime: Date };

function formatSlotTime(t: SlotTimes): string {
  return `${formatDate(t.startDateTime)}, ${formatTime(t.startDateTime)}–${formatTime(t.endDateTime)} Uhr`;
}

/**
 * Informiert bereits angemeldete Helfer, wenn sich Datum und/oder Zeit ihrer
 * Rolle geändert haben. `before` ist der Stand vor dem Speichern (pro
 * ShiftSlot-ID); verglichen wird mit dem aktuellen Stand in der Datenbank,
 * also nach dem Aufruf des Updates. Rollen ohne Änderung, ohne bestätigte
 * Anmeldungen oder bei abgesagten Einsätzen lösen keine Mail aus.
 */
export async function notifyRescheduledSlots(before: Map<string, SlotTimes>) {
  if (before.size === 0) return;

  const slots = await prisma.shiftSlot.findMany({
    where: { id: { in: [...before.keys()] }, deletedAt: null },
    include: {
      activity: true,
      event: { include: { location: true } },
      signups: { where: { status: "CONFIRMED" } },
    },
  });

  const changed = slots.filter((slot) => {
    const old = before.get(slot.id);
    return (
      old &&
      slot.signups.length > 0 &&
      slot.event.status !== "CANCELLED" &&
      (old.startDateTime.getTime() !== slot.startDateTime.getTime() ||
        old.endDateTime.getTime() !== slot.endDateTime.getTime())
    );
  });
  if (changed.length === 0) return;

  await ensureRescheduleTemplate();

  for (const slot of changed) {
    const old = before.get(slot.id)!;
    for (const signup of slot.signups) {
      await sendMail("EVENT_RESCHEDULED", signup.helperEmail, {
        vorname: signup.helperFirstName,
        nachname: signup.helperLastName,
        event: slot.event.title,
        taetigkeit: slot.activity.name,
        standort: slot.event.location?.name ?? slot.event.locationText ?? "",
        altesDatum: formatSlotTime(old),
        datum: formatSlotTime(slot),
      });
    }
  }
}
