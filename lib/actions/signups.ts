"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isShiftSlotVisible, canManageShiftSlot } from "@/lib/visibility";
import { canCancelSignup, validatePayoutChoice } from "@/lib/rules/signup-rules";
import { sendMail } from "@/lib/mail/send";
import type { SignupPayoutType } from "@/generated/prisma/enums";

export async function createSignup(
  prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "Bitte melde dich an.";

  const activeMember = session.user.member;
  if (!activeMember) return "Kein Mitgliedsprofil mit deinem Login verknüpft.";

  const shiftSlotId = String(formData.get("shiftSlotId") ?? "");
  const helperFirstName = String(formData.get("helperFirstName") ?? "").trim();
  const helperLastName = String(formData.get("helperLastName") ?? "").trim();
  const helperEmail = String(formData.get("helperEmail") ?? "").trim();
  const helperPhone = String(formData.get("helperPhone") ?? "").trim() || null;
  const payoutType = (formData.get("payoutType") as SignupPayoutType) || "HELFERKONTINGENT";
  const iban = String(formData.get("iban") ?? "").trim() || null;

  if (!helperFirstName || !helperLastName || !helperEmail || !helperPhone) {
    return "Name, Vorname, E-Mail und Telefonnummer sind Pflichtfelder.";
  }

  const shiftSlot = await prisma.shiftSlot.findUnique({
    where: { id: shiftSlotId },
    include: {
      activity: true,
      event: { include: { location: true, season: true } },
      ageGroupRestrictions: { include: { ageGroup: true } },
      signups: { where: { status: "CONFIRMED" } },
    },
  });

  if (!shiftSlot || shiftSlot.deletedAt || shiftSlot.event.deletedAt) {
    return "Dieser Einsatz existiert nicht mehr.";
  }

  if (!isShiftSlotVisible({ area: shiftSlot.area }, session.user.role)) {
    return "Dieser Einsatz ist für dich nicht freigegeben.";
  }

  const ageGroupTriggersBarbezug = shiftSlot.ageGroupRestrictions.some(
    (r) => r.ageGroup.triggersBarbezugChoice,
  );

  const payoutCheck = validatePayoutChoice({
    activityRequiresPayoutChoice: shiftSlot.activity.requiresPayoutChoice,
    ageGroupTriggersBarbezug,
    payoutType,
    iban,
  });
  if (!payoutCheck.ok) return payoutCheck.error;

  const ageGroupSnapshot = shiftSlot.ageGroupRestrictions[0]?.ageGroup.name ?? "Alle Teams";

  try {
    await prisma.$transaction(async (tx) => {
      const confirmedCount = await tx.signup.count({
        where: { shiftSlotId, status: "CONFIRMED" },
      });
      if (confirmedCount >= shiftSlot.capacity) {
        throw new Error("FULL");
      }

      const existing = await tx.signup.findFirst({
        where: { shiftSlotId, memberId: activeMember.id, status: "CONFIRMED" },
      });
      if (existing) {
        throw new Error("DUPLICATE");
      }

      await tx.signup.create({
        data: {
          shiftSlotId,
          memberId: activeMember.id,
          ageGroupSnapshot,
          helperFirstName,
          helperLastName,
          helperEmail,
          helperPhone,
          payoutType,
          ibanSnapshot: payoutType === "BARBEZUG" ? iban : null,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FULL") {
      return "Dieser Einsatz ist bereits vollständig besetzt.";
    }
    if (error instanceof Error && error.message === "DUPLICATE") {
      return "Du bist für diesen Einsatz bereits angemeldet.";
    }
    throw error;
  }

  await sendMail("SIGNUP_CONFIRMATION", helperEmail, {
    vorname: helperFirstName,
    nachname: helperLastName,
    event: shiftSlot.event.title,
    datum: shiftSlot.event.startDateTime.toLocaleString("de-CH"),
    taetigkeit: shiftSlot.activity.name,
    standort: shiftSlot.event.location?.name ?? shiftSlot.event.locationText ?? "",
  });

  revalidatePath("/einsaetze");
  revalidatePath("/mein-konto");
  return undefined;
}

export async function cancelSignup(signupId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Bitte melde dich an." };

  const signup = await prisma.signup.findUnique({
    where: { id: signupId },
    include: {
      shiftSlot: { include: { event: true, ageGroupRestrictions: true } },
    },
  });
  if (!signup || signup.status === "CANCELLED") {
    return { error: "Diese Anmeldung existiert nicht mehr." };
  }

  const isOwner = session.user.member?.id === signup.memberId;
  const isAdmin = await callerCanManageSignup(session.user.id, session.user.role, signup);

  if (!isOwner && !isAdmin) {
    return { error: "Du kannst diese Anmeldung nicht bearbeiten." };
  }

  if (!isAdmin && !canCancelSignup(signup.shiftSlot.event.startDateTime)) {
    return {
      error:
        "Eine Abmeldung ist nur bis 4 Tage vor dem Einsatz möglich. Bitte kontaktiere die Geschäftsstelle.",
    };
  }

  await prisma.signup.update({
    where: { id: signupId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  revalidatePath("/einsaetze");
  revalidatePath("/mein-konto");
  return {};
}

export async function updateSignupContact(
  signupId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Bitte melde dich an." };

  const signup = await prisma.signup.findUnique({
    where: { id: signupId },
    include: { shiftSlot: { include: { ageGroupRestrictions: true } } },
  });
  if (!signup) return { error: "Diese Anmeldung existiert nicht mehr." };

  const isAdmin = await callerCanManageSignup(session.user.id, session.user.role, signup);
  if (!isAdmin) return { error: "Keine Berechtigung." };

  const helperFirstName = String(formData.get("helperFirstName") ?? "").trim();
  const helperLastName = String(formData.get("helperLastName") ?? "").trim();
  const helperEmail = String(formData.get("helperEmail") ?? "").trim();
  const helperPhone = String(formData.get("helperPhone") ?? "").trim() || null;

  if (!helperFirstName || !helperLastName || !helperEmail) {
    return { error: "Name, Vorname und E-Mail sind Pflichtfelder." };
  }

  await prisma.signup.update({
    where: { id: signupId },
    data: { helperFirstName, helperLastName, helperEmail, helperPhone },
  });

  revalidatePath("/stufenleiter");
  revalidatePath("/geschaeftsstelle");
  return {};
}

async function callerCanManageSignup(
  userId: string,
  role: "GESCHAEFTSSTELLE" | "STUFENLEITER" | "FUNKTIONAER" | "MITGLIED",
  signup: { shiftSlot: { ageGroupRestrictions: { ageGroupId: string }[] } },
): Promise<boolean> {
  if (role === "GESCHAEFTSSTELLE") return true;
  if (role !== "STUFENLEITER") return false;

  const assignments = await prisma.stufenleiterAssignment.findMany({
    where: { userId },
    select: { ageGroupId: true },
  });
  const allowed = new Set(assignments.map((a) => a.ageGroupId));
  return canManageShiftSlot(
    role,
    signup.shiftSlot.ageGroupRestrictions.map((r) => r.ageGroupId),
    allowed,
  );
}
