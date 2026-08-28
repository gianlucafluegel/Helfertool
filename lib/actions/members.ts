"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendMail } from "@/lib/mail/send";
import type { EventType, ShiftArea, UserRole } from "@/generated/prisma/enums";

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
  return session;
}

export async function createMember(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();

  const externalContactId = String(formData.get("externalContactId") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const ageGroupId = String(formData.get("ageGroupId") ?? "").trim();
  const targetHoursRaw = formData.get("targetHours");
  const targetHours = Number(targetHoursRaw);

  if (
    !externalContactId ||
    !firstName ||
    !lastName ||
    !email ||
    !ageGroupId ||
    targetHoursRaw === null ||
    targetHoursRaw === "" ||
    !Number.isFinite(targetHours)
  ) {
    return "Kontakt-ID, Vorname, Name, E-Mail, Stufe und Soll-Stunden sind Pflichtfelder.";
  }

  const contactIdTaken = await prisma.member.findUnique({ where: { externalContactId } });
  if (contactIdTaken) {
    return "Diese Kontakt-ID wird bereits verwendet.";
  }

  const member = await prisma.member.create({
    data: { firstName, lastName, email, externalContactId, ageGroupId, targetHours },
  });

  revalidatePath("/geschaeftsstelle/members");
  redirect(`/geschaeftsstelle/members/${member.id}`);
}

export async function updateMember(memberId: string, formData: FormData) {
  await requireGeschaeftsstelle();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const ageGroupId = String(formData.get("ageGroupId") ?? "").trim() || null;
  const targetHours = Number(formData.get("targetHours") ?? 0);

  await prisma.member.update({
    where: { id: memberId },
    data: {
      firstName,
      lastName,
      email,
      phone,
      ageGroupId,
      targetHours: Number.isFinite(targetHours) ? targetHours : 0,
    },
  });

  revalidatePath(`/geschaeftsstelle/members/${memberId}`);
  revalidatePath("/geschaeftsstelle/members");
}

/**
 * Credits a member with hours for an Einsatz that was never tracked in the
 * tool (e.g. done before go-live, or corrected after the fact). Asks for the
 * same info as creating a real Helfereinsatz (Titel/Typ/Standort/
 * Beschreibung/Datum + Tätigkeit/Bereich/Stunden), because that's exactly
 * what it creates under the hood — a one-slot Event+ShiftSlot with a
 * CONFIRMED Signup for this member — just flagged isManualEntry so it never
 * shows up in the normal Einsätze browsing/overview lists.
 */
export async function addManualHours(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();

  const memberId = String(formData.get("memberId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const type = formData.get("type") as EventType;
  const locationId = String(formData.get("locationId") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim();
  const startDateTime = String(formData.get("startDateTime") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  const area = formData.get("area") as ShiftArea;
  const creditHoursRaw = formData.get("creditHours");
  const creditHours = Number(creditHoursRaw);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (
    !memberId ||
    !title ||
    !description ||
    !startDateTime ||
    !activityId ||
    !area ||
    creditHoursRaw === null ||
    creditHoursRaw === "" ||
    !Number.isFinite(creditHours)
  ) {
    return "Mitglied, Titel, Beschreibung, Datum/Zeit, Tätigkeit, Bereich und Stunden sind Pflichtfelder.";
  }

  const [member, season] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId } }),
    getCurrentSeason(),
  ]);
  if (!member) return "Mitglied nicht gefunden.";
  if (!season) return "Keine aktive Saison konfiguriert.";

  await prisma.event.create({
    data: {
      seasonId: season.id,
      type,
      title,
      description,
      locationId,
      startDateTime: new Date(startDateTime),
      isManualEntry: true,
      shiftSlots: {
        create: {
          activityId,
          area,
          capacity: 1,
          creditHours,
          notes,
          signups: {
            create: {
              memberId,
              ageGroupSnapshot: "Alle Stufen",
              helperFirstName: member.firstName,
              helperLastName: member.lastName,
              helperEmail: member.email ?? "",
              payoutType: "HELFERKONTINGENT",
            },
          },
        },
      },
    },
  });

  revalidatePath("/geschaeftsstelle/members");
  revalidatePath(`/geschaeftsstelle/members/${memberId}`);
  revalidatePath("/mein-konto");
  return undefined;
}

export async function inviteMemberLogin(
  memberId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireGeschaeftsstelle();

  const member = await prisma.member.findUnique({ where: { id: memberId }, include: { user: true } });
  if (!member || !member.email) {
    return { error: "Mitglied hat keine E-Mail-Adresse hinterlegt." };
  }

  const role = formData.get("role") as UserRole;
  const stufenleiterAgeGroupIds = formData.getAll("stufenleiterAgeGroupIds").map(String);

  let user = member.user;

  if (user) {
    // Re-invite / role change for this member's own existing login.
    if (user.role !== role || user.email !== member.email) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role, email: member.email },
      });
    }
  } else {
    // Every login must map to exactly one Member — if this email is already
    // taken by a different member's login, refuse rather than silently
    // sharing an account across two people's helper-hour records.
    const emailTaken = await prisma.user.findUnique({ where: { email: member.email } });
    if (emailTaken) {
      return {
        error:
          "Diese E-Mail-Adresse wird bereits für einen anderen Login verwendet. Jedes Mitglied benötigt eine eigene, eindeutige E-Mail-Adresse für den Login.",
      };
    }
    user = await prisma.user.create({
      data: { email: member.email, role, memberId },
    });
  }

  if (role === "STUFENLEITER") {
    await prisma.stufenleiterAssignment.deleteMany({ where: { userId: user.id } });
    if (stufenleiterAgeGroupIds.length > 0) {
      await prisma.stufenleiterAssignment.createMany({
        data: stufenleiterAgeGroupIds.map((ageGroupId) => ({ userId: user.id, ageGroupId })),
      });
    }
  }

  const rawToken = await createAuthToken(user.id, "ACCOUNT_SETUP");
  const link = `${process.env.NEXTAUTH_URL}/set-password?token=${rawToken}&purpose=ACCOUNT_SETUP`;

  await sendMail("ACCOUNT_SETUP", member.email, {
    vorname: member.firstName,
    nachname: member.lastName,
    link,
  });

  revalidatePath(`/geschaeftsstelle/members/${memberId}`);
  return {};
}
