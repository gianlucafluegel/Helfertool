"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MailTemplateKey } from "@/generated/prisma/enums";

export async function updateMailTemplate(key: MailTemplateKey, formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const bodyText = String(formData.get("bodyText") ?? "");

  await prisma.mailTemplate.update({
    where: { key },
    data: { subject, bodyText },
  });

  revalidatePath("/geschaeftsstelle/mail-templates");
}
