"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateProfile(
  prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "Bitte melde dich an.";

  const memberId = String(formData.get("memberId") ?? "");
  if (session.user.member?.id !== memberId) {
    return "Dieses Mitglied ist nicht mit deinem Login verknüpft.";
  }

  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const iban = String(formData.get("iban") ?? "").trim();

  await prisma.member.update({
    where: { id: memberId },
    data: {
      email: email || null,
      phone: phone || null,
      iban: iban || null,
    },
  });

  revalidatePath("/profil");
  return undefined;
}
