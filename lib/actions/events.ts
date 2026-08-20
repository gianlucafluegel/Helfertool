"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageShiftSlot } from "@/lib/visibility";
import type { EventType } from "@/generated/prisma/enums";

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

export async function createEvent(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();

  const seasonId = String(formData.get("seasonId") ?? "");
  const type = formData.get("type") as EventType;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const locationId = String(formData.get("locationId") ?? "") || null;
  const startDateTime = String(formData.get("startDateTime") ?? "");

  if (!seasonId || !title || !description || !startDateTime) {
    return "Saison, Titel, Beschreibung und Datum/Zeit sind Pflichtfelder.";
  }

  const event = await prisma.event.create({
    data: {
      seasonId,
      type,
      title,
      description,
      locationId,
      startDateTime: new Date(startDateTime),
    },
  });

  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  redirect(`/geschaeftsstelle/helfereinsaetze/${event.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  await assertCanEditEvent(eventId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const locationId = String(formData.get("locationId") ?? "") || null;
  const startDateTime = String(formData.get("startDateTime") ?? "");
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
      startDateTime: startDateTime ? new Date(startDateTime) : undefined,
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
