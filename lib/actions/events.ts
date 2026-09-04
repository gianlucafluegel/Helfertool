"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { canManageShiftSlot } from "@/lib/visibility";

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
  return session;
}

/**
 * Geschäftsstelle can edit any event. Stufenleiter can correct an event's
 * info (title/description/date/location/status) only when it has at least
 * one ShiftSlot restricted to one of their assigned Stufen — they still
 * can't create, delete, or add/remove ShiftSlots (see the other actions
 * below, which stay Geschäftsstelle-only).
 */
async function assertCanEditEvent(eventId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Keine Berechtigung.");
  if (session.user.role === "GESCHAEFTSSTELLE") return session;

  if (session.user.role === "STUFENLEITER") {
    const [assignments, shiftSlots] = await Promise.all([
      prisma.stufenleiterAssignment.findMany({
        where: { userId: session.user.id },
        select: { ageGroupId: true },
      }),
      prisma.shiftSlot.findMany({
        where: { eventId, deletedAt: null },
        include: { ageGroupRestrictions: true },
      }),
    ]);
    const allowed = new Set(assignments.map((a) => a.ageGroupId));
    const canEdit = shiftSlots.some((slot) =>
      canManageShiftSlot(
        "STUFENLEITER",
        slot.ageGroupRestrictions.map((r) => r.ageGroupId),
        allowed,
      ),
    );
    if (canEdit) return session;
  }

  throw new Error("Keine Berechtigung.");
}

/** Combines separate Datum/Start(/Ende)-Feldern into one Date. */
function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

/**
 * Creates the ShiftSlot every manually erfasster Helfereinsatz gets — always
 * the generic "Helfer (allgemein)"-Tätigkeit, Bereich Helfer, ein Platz.
 * Differentiated Rollen (andere Tätigkeit/Bereich/Kapazität/Team-
 * Einschränkung) bleiben weiterhin über "Weitere Rolle hinzufügen" auf der
 * Einsatz-Detailseite ergänzbar — dieser Flow deckt nur den Standardfall ab.
 */
async function createDefaultShiftSlot(eventId: string, creditHours: number, memberId: string | null) {
  const defaultActivity = await prisma.activity.findFirst({
    where: { name: "Helfer (allgemein)" },
  });
  if (!defaultActivity) {
    throw new Error(
      "Standard-Tätigkeit 'Helfer (allgemein)' nicht gefunden. Bitte Geschäftsstelle kontaktieren.",
    );
  }

  const member = memberId ? await prisma.member.findUnique({ where: { id: memberId } }) : null;

  await prisma.shiftSlot.create({
    data: {
      eventId,
      activityId: defaultActivity.id,
      area: "HELFER",
      capacity: 1,
      creditHours,
      ...(member
        ? {
            signups: {
              create: {
                memberId: member.id,
                ageGroupSnapshot: "Alle Teams",
                helperFirstName: member.firstName,
                helperLastName: member.lastName,
                helperEmail: member.email ?? "",
                helperPhone: member.phone,
                payoutType: "HELFERKONTINGENT",
              },
            },
          }
        : {}),
    },
  });
}

export async function createGameEvent(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();

  const title = String(formData.get("title") ?? "").trim();
  const locationId = String(formData.get("locationId") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const creditHoursRaw = formData.get("creditHours");
  const creditHours = Number(creditHoursRaw);
  const memberId = String(formData.get("memberId") ?? "") || null;

  if (
    !title ||
    !locationId ||
    !description ||
    !date ||
    !startTime ||
    !endTime ||
    creditHoursRaw === null ||
    creditHoursRaw === "" ||
    !Number.isFinite(creditHours)
  ) {
    return "Titel, Standort, Einsatzbeschrieb, Datum, Start, Ende und Anzahl Helferstunden sind Pflichtfelder.";
  }

  const season = await getCurrentSeason();
  if (!season) return "Keine aktive Saison konfiguriert.";

  const event = await prisma.event.create({
    data: {
      seasonId: season.id,
      type: "GAME",
      title,
      description,
      locationId,
      startDateTime: combineDateTime(date, startTime),
      endDateTime: combineDateTime(date, endTime),
    },
  });

  await createDefaultShiftSlot(event.id, creditHours, memberId);

  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  redirect(`/geschaeftsstelle/helfereinsaetze/${event.id}`);
}

export async function createExternalEvent(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();

  const title = String(formData.get("title") ?? "").trim();
  const locationText = String(formData.get("locationText") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim();
  const pickupLocation = String(formData.get("pickupLocation") ?? "").trim() || null;
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const creditHoursRaw = formData.get("creditHours");
  const creditHours = Number(creditHoursRaw);
  const memberId = String(formData.get("memberId") ?? "") || null;

  if (
    !title ||
    !locationText ||
    !description ||
    !requirements ||
    !date ||
    !startTime ||
    !endTime ||
    creditHoursRaw === null ||
    creditHoursRaw === "" ||
    !Number.isFinite(creditHours)
  ) {
    return "Titel, Ort, Einsatzbeschrieb, Anforderungen, Datum, Start, Ende und Anzahl Helferstunden sind Pflichtfelder.";
  }

  const season = await getCurrentSeason();
  if (!season) return "Keine aktive Saison konfiguriert.";

  const event = await prisma.event.create({
    data: {
      seasonId: season.id,
      type: "EXTERNAL",
      title,
      description,
      locationText,
      requirements,
      pickupLocation,
      startDateTime: combineDateTime(date, startTime),
      endDateTime: combineDateTime(date, endTime),
    },
  });

  await createDefaultShiftSlot(event.id, creditHours, memberId);

  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  redirect(`/geschaeftsstelle/helfereinsaetze/${event.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  await assertCanEditEvent(eventId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  // GAME sendet locationId (Dropdown), EXTERNAL sendet locationText/
  // requirements/pickupLocation (Freitext) — je nach Typ des Events fehlt
  // das jeweils andere Set im FormData und wird hier korrekt zu null.
  const locationId = String(formData.get("locationId") ?? "") || null;
  const locationText = String(formData.get("locationText") ?? "").trim() || null;
  const requirements = String(formData.get("requirements") ?? "").trim() || null;
  const pickupLocation = String(formData.get("pickupLocation") ?? "").trim() || null;
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const status = String(formData.get("status") ?? "SCHEDULED") as
    | "SCHEDULED"
    | "CANCELLED"
    | "POSTPONED";

  if (!title || !description) {
    return;
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      description,
      locationId,
      locationText,
      requirements,
      pickupLocation,
      startDateTime: date && startTime ? combineDateTime(date, startTime) : undefined,
      endDateTime: date && endTime ? combineDateTime(date, endTime) : null,
      status,
    },
  });

  revalidatePath(`/geschaeftsstelle/helfereinsaetze/${eventId}`);
  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  revalidatePath("/stufenleiter", "layout");
}

export async function deleteEvent(eventId: string) {
  await requireGeschaeftsstelle();
  await prisma.event.update({ where: { id: eventId }, data: { deletedAt: new Date() } });
  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  redirect("/geschaeftsstelle/helfereinsaetze");
}

export async function addShiftSlot(eventId: string, formData: FormData) {
  await requireGeschaeftsstelle();

  const activityId = String(formData.get("activityId") ?? "");
  const area = formData.get("area") as "HELFER" | "FUNKTIONAER";
  const capacity = Number(formData.get("capacity") ?? 1);
  const creditHours = Number(formData.get("creditHours") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const ageGroupIds = formData.getAll("ageGroupIds").map(String);

  if (!activityId || !area) {
    return "Tätigkeit und Bereich sind Pflichtfelder.";
  }

  await prisma.shiftSlot.create({
    data: {
      eventId,
      activityId,
      area,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 1,
      creditHours: Number.isFinite(creditHours) ? creditHours : 0,
      notes,
      ageGroupRestrictions: {
        create: ageGroupIds.map((ageGroupId) => ({ ageGroupId })),
      },
    },
  });

  revalidatePath(`/geschaeftsstelle/helfereinsaetze/${eventId}`);
}

export async function deleteShiftSlot(eventId: string, shiftSlotId: string) {
  await requireGeschaeftsstelle();
  await prisma.shiftSlot.update({ where: { id: shiftSlotId }, data: { deletedAt: new Date() } });
  revalidatePath(`/geschaeftsstelle/helfereinsaetze/${eventId}`);
}
