"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuthToken, consumeAuthToken } from "@/lib/auth-tokens";
import { sendMail } from "@/lib/mail/send";

export async function login(prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: (formData.get("callbackUrl") as string) || "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "E-Mail oder Passwort ist falsch.";
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function requestPasswordReset(
  prevState: string | undefined,
  formData: FormData,
): Promise<string> {
  const email = String(formData.get("email") ?? "").toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    include: { member: true },
  });

  // Always return the same message, regardless of whether the account exists,
  // so this endpoint can't be used to enumerate registered email addresses.
  const confirmation =
    "Falls diese E-Mail-Adresse registriert ist, wurde ein Link zum Zurücksetzen des Passworts versendet.";

  if (!user || !user.isActive) {
    return confirmation;
  }

  const rawToken = await createAuthToken(user.id, "PASSWORD_RESET");
  const link = `${process.env.NEXTAUTH_URL}/set-password?token=${rawToken}&purpose=PASSWORD_RESET`;
  const member = user.member;

  await sendMail("PASSWORD_RESET", user.email, {
    vorname: member?.firstName ?? "",
    nachname: member?.lastName ?? "",
    link,
  });

  return confirmation;
}

export async function setPassword(
  prevState: string | undefined,
  formData: FormData,
): Promise<string> {
  const token = String(formData.get("token") ?? "");
  const purpose = formData.get("purpose") === "PASSWORD_RESET" ? "PASSWORD_RESET" : "ACCOUNT_SETUP";
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 8) {
    return "Das Passwort muss mindestens 8 Zeichen lang sein.";
  }
  if (password !== passwordConfirm) {
    return "Die Passwörter stimmen nicht überein.";
  }

  const user = await consumeAuthToken(token, purpose);
  if (!user) {
    return "Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.";
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  redirect("/login");
}
