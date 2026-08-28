"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseMemberWorkbook } from "@/lib/import/members";
import { extractAgeNumber } from "@/lib/import/mysihf";

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
  return session;
}

export type MemberImportPreviewRow = {
  contactId: string;
  email: string;
  firstName: string;
  lastName: string;
  targetHours: number;
  ageGroupGuessId: string | null;
  willUpdate: boolean;
};

export type MemberImportPreviewState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "preview";
      rows: MemberImportPreviewRow[];
      ageGroups: { id: string; name: string }[];
    };

export async function parseMemberImportFile(
  prevState: MemberImportPreviewState,
  formData: FormData,
): Promise<MemberImportPreviewState> {
  await requireGeschaeftsstelle();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Bitte eine Excel-Datei auswählen." };
  }

  const buffer = await file.arrayBuffer();
  const { rows, error } = await parseMemberWorkbook(buffer);
  if (error) {
    return { status: "error", message: error };
  }
  if (rows.length === 0) {
    return { status: "error", message: "Keine Mitgliederzeilen in der Datei gefunden." };
  }

  const [existing, ageGroups] = await Promise.all([
    prisma.member.findMany({
      where: { externalContactId: { in: rows.map((r) => r.contactId) } },
      select: { externalContactId: true },
    }),
    prisma.ageGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const existingIds = new Set(existing.map((e) => e.externalContactId));

  return {
    status: "preview",
    rows: rows.map((r) => ({
      contactId: r.contactId,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      targetHours: r.targetHours,
      ageGroupGuessId:
        r.ageGroupNumber !== null
          ? (ageGroups.find((ag) => extractAgeNumber(ag.name) === r.ageGroupNumber)?.id ?? null)
          : null,
      willUpdate: existingIds.has(r.contactId),
    })),
    ageGroups: ageGroups.map((ag) => ({ id: ag.id, name: ag.name })),
  };
}

export async function commitMemberImport(
  rows: (MemberImportPreviewRow & { ageGroupId: string | null })[],
): Promise<{ error?: string; created?: number; updated?: number }> {
  const session = await requireGeschaeftsstelle();

  if (rows.length === 0) {
    return { error: "Keine Mitglieder ausgewählt." };
  }

  const batch = await prisma.importBatch.create({
    data: { source: "Mitglieder-Import (Privatpersonen)", importedByUserId: session.user.id },
  });

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const existing = await prisma.member.findUnique({
      where: { externalContactId: row.contactId },
    });

    const data = {
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email || null,
      ageGroupId: row.ageGroupId,
      targetHours: row.targetHours,
      importBatchId: batch.id,
    };

    if (existing) {
      await prisma.member.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.member.create({ data: { ...data, externalContactId: row.contactId } });
      created += 1;
    }
  }

  revalidatePath("/geschaeftsstelle/members");
  revalidatePath("/geschaeftsstelle/datenbank");
  return { created, updated };
}
