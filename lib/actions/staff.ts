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

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const stufenleiterAgeGroupIds = formData.getAll("stufenleiterAgeGroupIds").map(String);

  if (!firstName || !lastName || !email) {
    return "Vorname, Name und E-Mail sind Pflichtfelder.";
  }

  // Funktionäre are tracked like a Mitglied (Kontakt-ID/Soll-Stunden for
  // hours bookkeeping); Stufenadmins are a pure staff role and only need
  // Name/E-Mail/Stufe(n) — no roster fields to fill in.
  let externalContactId: string | null = null;
  let targetHours = 0;

  if (role === "FUNKTIONAER") {
    externalContactId = String(formData.get("externalContactId") ?? "").trim();
    const targetHoursRaw = formData.get("targetHours");
    const targetHoursNum = Number(targetHoursRaw);

    if (
      !externalContactId ||
      targetHoursRaw === null ||
      targetHoursRaw === "" ||
      !Number.isFinite(targetHoursNum)
    ) {
      return "Kontakt-ID, Vorname, Name, E-Mail und Soll-Stunden sind Pflichtfelder.";
    }
    targetHours = targetHoursNum;
  }

  // Funktionäre/Stufenadmins never get an ageGroupId on their own Member row,
  // so their category is always null — the (Kontakt-ID, Kategorie) key means
  // this only needs to check for a collision among other category:null
  // Members (other staff, or legacy no-Stufe roster rows).
  const [contactIdTaken, emailTaken] = await Promise.all([
    externalContactId
      ? prisma.member.findFirst({ where: { externalContactId, category: null } })
      : null,
    prisma.user.findUnique({ where: { email } }),
  ]);
  if (contactIdTaken) return "Diese Kontakt-ID wird bereits verwendet.";
  if (emailTaken) {
    return "Diese E-Mail-Adresse wird bereits für einen anderen Login verwendet.";
  }

  const member = await prisma.member.create({
    data: { firstName, lastName, email, externalContactId, targetHours },
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
