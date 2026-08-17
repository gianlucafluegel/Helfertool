"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { EventType } from "@/generated/prisma/enums";

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
  return session;
}

export async function createEvent(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();

  const seasonId = String(formData.get("seasonId") ?? "");
  const type = formData.get("type") as EventType;
  const title = String(formData.get("title") ?? "").trim();
  const opponent = String(formData.get("opponent") ?? "").trim() || null;
  const locationId = String(formData.get("locationId") ?? "") || null;
  const startDateTime = String(formData.get("startDateTime") ?? "");

  if (!seasonId || !title || !startDateTime) {
    return "Saison, Titel und Datum/Zeit sind Pflichtfelder.";
  }

  const event = await prisma.event.create({
    data: {
      seasonId,
      type,
      title,
      opponent,
      locationId,
      startDateTime: new Date(startDateTime),
    },
  });

  revalidatePath("/geschaeftsstelle/events");
  redirect(`/geschaeftsstelle/events/${event.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  await requireGeschaeftsstelle();

  const title = String(formData.get("title") ?? "").trim();
  const opponent = String(formData.get("opponent") ?? "").trim() || null;
  const locationId = String(formData.get("locationId") ?? "") || null;
  const startDateTime = String(formData.get("startDateTime") ?? "");
  const status = String(formData.get("status") ?? "SCHEDULED") as
    | "SCHEDULED"
    | "CANCELLED"
    | "POSTPONED";

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      opponent,
      locationId,
      startDateTime: startDateTime ? new Date(startDateTime) : undefined,
      status,
    },
  });

  revalidatePath(`/geschaeftsstelle/events/${eventId}`);
  revalidatePath("/geschaeftsstelle/events");
}

export async function deleteEvent(eventId: string) {
  await requireGeschaeftsstelle();
  await prisma.event.update({ where: { id: eventId }, data: { deletedAt: new Date() } });
  revalidatePath("/geschaeftsstelle/events");
  redirect("/geschaeftsstelle/events");
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

  revalidatePath(`/geschaeftsstelle/events/${eventId}`);
}

export async function deleteShiftSlot(eventId: string, shiftSlotId: string) {
  await requireGeschaeftsstelle();
  await prisma.shiftSlot.update({ where: { id: shiftSlotId }, data: { deletedAt: new Date() } });
  revalidatePath(`/geschaeftsstelle/events/${eventId}`);
}
