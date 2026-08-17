"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setActiveMemberCookie } from "@/lib/active-member";

export async function switchActiveMember(memberId: string) {
  const session = await auth();
  const isLinked = session?.user.members.some((m) => m.id === memberId);
  if (!isLinked) {
    throw new Error("Dieses Mitglied ist nicht mit deinem Login verknüpft.");
  }

  await setActiveMemberCookie(memberId);
  revalidatePath("/", "layout");
}
