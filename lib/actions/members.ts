"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendMail } from "@/lib/mail/send";
import type { UserRole } from "@/generated/prisma/enums";

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
  return session;
}

export async function createMember(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const ageGroupId = String(formData.get("ageGroupId") ?? "") || null;
  const targetHours = Number(formData.get("targetHours") ?? 0);
  const externalContactId = String(formData.get("externalContactId") ?? "").trim() || null;

  if (!firstName || !lastName) {
    return "Vorname und Name sind Pflichtfelder.";
  }

  const season = await getCurrentSeason();

  const member = await prisma.member.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      externalContactId,
      ...(season && ageGroupId
        ? {
            seasonMemberships: {
              create: {
                seasonId: season.id,
                ageGroupId,
                targetHours: Number.isFinite(targetHours) ? targetHours : 0,
              },
            },
          }
        : {}),
    },
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
  const ageGroupId = String(formData.get("ageGroupId") ?? "") || null;
  const targetHours = Number(formData.get("targetHours") ?? 0);

  await prisma.member.update({
    where: { id: memberId },
    data: { firstName, lastName, email, phone },
  });

  const season = await getCurrentSeason();
  if (season && ageGroupId) {
    await prisma.seasonMembership.upsert({
      where: { memberId_seasonId: { memberId, seasonId: season.id } },
      update: { ageGroupId, targetHours: Number.isFinite(targetHours) ? targetHours : 0 },
      create: {
        memberId,
        seasonId: season.id,
        ageGroupId,
        targetHours: Number.isFinite(targetHours) ? targetHours : 0,
      },
    });
  }

  revalidatePath(`/geschaeftsstelle/members/${memberId}`);
  revalidatePath("/geschaeftsstelle/members");
}

export async function inviteMemberLogin(memberId: string, formData: FormData) {
  await requireGeschaeftsstelle();

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member || !member.email) {
    return { error: "Mitglied hat keine E-Mail-Adresse hinterlegt." };
  }

  const role = formData.get("role") as UserRole;
  const stufenleiterAgeGroupIds = formData.getAll("stufenleiterAgeGroupIds").map(String);

  const existing = await prisma.user.findUnique({ where: { email: member.email } });
  const user =
    existing ??
    (await prisma.user.create({
      data: { email: member.email, role },
    }));

  if (existing && existing.role !== role) {
    await prisma.user.update({ where: { id: user.id }, data: { role } });
  }

  await prisma.userMemberLink.upsert({
    where: { userId_memberId: { userId: user.id, memberId } },
    update: { isPrimary: true },
    create: { userId: user.id, memberId, isPrimary: true },
  });

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
