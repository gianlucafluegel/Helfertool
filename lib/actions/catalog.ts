"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ShiftArea } from "@/generated/prisma/enums";

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
}

export async function createAgeGroup(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "Name ist ein Pflichtfeld.";
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const triggersBarbezugChoice = formData.get("triggersBarbezugChoice") === "on";

  await prisma.ageGroup.create({
    data: { name, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0, triggersBarbezugChoice },
  });
  revalidatePath("/geschaeftsstelle/age-groups");
}

export async function toggleAgeGroupActive(id: string) {
  await requireGeschaeftsstelle();
  const ageGroup = await prisma.ageGroup.findUniqueOrThrow({ where: { id } });
  await prisma.ageGroup.update({ where: { id }, data: { isActive: !ageGroup.isActive } });
  revalidatePath("/geschaeftsstelle/age-groups");
}

export async function createLocation(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "Name ist ein Pflichtfeld.";
  const address = String(formData.get("address") ?? "").trim() || null;

  await prisma.location.create({ data: { name, address } });
  revalidatePath("/geschaeftsstelle/locations");
}

export async function toggleLocationActive(id: string) {
  await requireGeschaeftsstelle();
  const location = await prisma.location.findUniqueOrThrow({ where: { id } });
  await prisma.location.update({ where: { id }, data: { isActive: !location.isActive } });
  revalidatePath("/geschaeftsstelle/locations");
}

export async function createActivity(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "Name ist ein Pflichtfeld.";
  const defaultArea = (formData.get("defaultArea") as ShiftArea) || null;
  const requiresPayoutChoice = formData.get("requiresPayoutChoice") === "on";

  await prisma.activity.create({ data: { name, defaultArea, requiresPayoutChoice } });
  revalidatePath("/geschaeftsstelle/taetigkeiten");
}

export async function toggleActivityActive(id: string) {
  await requireGeschaeftsstelle();
  const activity = await prisma.activity.findUniqueOrThrow({ where: { id } });
  await prisma.activity.update({ where: { id }, data: { isActive: !activity.isActive } });
  revalidatePath("/geschaeftsstelle/taetigkeiten");
}
