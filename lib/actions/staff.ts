"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendMail } from "@/lib/mail/send";

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
  return session;
}

/**
 * Funktionäre and Stufenadmins are Members too, but — unlike a plain
 * Mitglied — the whole point of adding one is that they get a login with
 * that specific role right away, so this combines what's normally two
 * separate steps (Mitglied erfassen, then Login erstellen & einladen) into
 * one form on their dedicated Geschäftsstelle section.
 */
async function createStaffMember(
  role: "FUNKTIONAER" | "STUFENLEITER",
  formData: FormData,
): Promise<string | undefined> {
  await requireGeschaeftsstelle();

  const externalContactId = String(formData.get("externalContactId") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const ageRaw = formData.get("age");
  const age = Number(ageRaw);
  const targetHoursRaw = formData.get("targetHours");
  const targetHours = Number(targetHoursRaw);
  const stufenleiterAgeGroupIds = formData.getAll("stufenleiterAgeGroupIds").map(String);

  if (
    !externalContactId ||
    !firstName ||
    !lastName ||
    !email ||
    ageRaw === null ||
    ageRaw === "" ||
    !Number.isFinite(age) ||
    targetHoursRaw === null ||
    targetHoursRaw === "" ||
    !Number.isFinite(targetHours)
  ) {
    return "Kontakt-ID, Vorname, Name, E-Mail, Alter und Soll-Stunden sind Pflichtfelder.";
  }

  const [contactIdTaken, emailTaken] = await Promise.all([
    prisma.member.findUnique({ where: { externalContactId } }),
    prisma.user.findUnique({ where: { email } }),
  ]);
  if (contactIdTaken) return "Diese Kontakt-ID wird bereits verwendet.";
  if (emailTaken) {
    return "Diese E-Mail-Adresse wird bereits für einen anderen Login verwendet.";
  }

  const member = await prisma.member.create({
    data: { firstName, lastName, email, externalContactId, age, targetHours },
  });
  const user = await prisma.user.create({ data: { email, role, memberId: member.id } });

  if (role === "STUFENLEITER" && stufenleiterAgeGroupIds.length > 0) {
    await prisma.stufenleiterAssignment.createMany({
      data: stufenleiterAgeGroupIds.map((ageGroupId) => ({ userId: user.id, ageGroupId })),
    });
  }

  const rawToken = await createAuthToken(user.id, "ACCOUNT_SETUP");
  const link = `${process.env.NEXTAUTH_URL}/set-password?token=${rawToken}&purpose=ACCOUNT_SETUP`;
  await sendMail("ACCOUNT_SETUP", email, { vorname: firstName, nachname: lastName, link });

  revalidatePath(role === "FUNKTIONAER" ? "/geschaeftsstelle/funktionaere" : "/geschaeftsstelle/stufenadmins");
  redirect(`/geschaeftsstelle/members/${member.id}`);
}

export async function createFunktionaer(prevState: string | undefined, formData: FormData) {
  return createStaffMember("FUNKTIONAER", formData);
}

export async function createStufenadmin(prevState: string | undefined, formData: FormData) {
  return createStaffMember("STUFENLEITER", formData);
}
