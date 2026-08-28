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
  /**
   * Every Kontakt-ID present in the uploaded file, regardless of which rows
   * were checked for import — used to detect members who dropped out of the
   * roster (not just rows the admin happened to uncheck this time).
   */
  allContactIdsInFile: string[],
): Promise<{
  error?: string;
  created?: number;
  updated?: number;
  deactivated?: number;
  emailConflicts?: string[];
}> {
  const session = await requireGeschaeftsstelle();

  if (rows.length === 0) {
    return { error: "Keine Mitglieder ausgewählt." };
  }

  const batch = await prisma.importBatch.create({
    data: { source: "Mitglieder-Import (Privatpersonen)", importedByUserId: session.user.id },
  });

  let created = 0;
  let updated = 0;
  const emailConflicts: string[] = [];

  for (const row of rows) {
    const existing = await prisma.member.findUnique({
      where: { externalContactId: row.contactId },
      include: { user: true },
    });

    const data = {
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email || null,
      ageGroupId: row.ageGroupId,
      targetHours: row.targetHours,
      importBatchId: batch.id,
      isActive: true,
    };

    if (existing) {
      await prisma.member.update({ where: { id: existing.id }, data });
      updated += 1;

      if (existing.user) {
        if (row.email && existing.user.email !== row.email) {
          // Keep the login in sync with the roster's E-Mail — unless that
          // address is already someone else's login, which we refuse to
          // silently overwrite.
          const emailTaken = await prisma.user.findUnique({ where: { email: row.email } });
          if (emailTaken && emailTaken.id !== existing.user.id) {
            emailConflicts.push(`${row.firstName} ${row.lastName} (${row.email})`);
          } else {
            await prisma.user.update({
              where: { id: existing.user.id },
              data: { email: row.email, isActive: true },
            });
          }
        } else if (!existing.user.isActive) {
          // Member re-appeared in the roster — reactivate a login that was
          // previously deactivated for being missing from an earlier import.
          await prisma.user.update({ where: { id: existing.user.id }, data: { isActive: true } });
        }
      }
    } else {
      await prisma.member.create({ data: { ...data, externalContactId: row.contactId } });
      created += 1;
    }
  }

  // Members that used to exist but aren't in this roster file anymore:
  // deactivate them (and their login, if any) rather than deleting — their
  // historical hours/signups stay intact, and they come back automatically
  // if a future import includes their Kontakt-ID again.
  const missing = await prisma.member.findMany({
    where: {
      isActive: true,
      externalContactId: { not: null, notIn: allContactIdsInFile },
    },
    include: { user: true },
  });
  for (const m of missing) {
    await prisma.member.update({ where: { id: m.id }, data: { isActive: false } });
    if (m.user) {
      await prisma.user.update({ where: { id: m.user.id }, data: { isActive: false } });
    }
  }

  revalidatePath("/geschaeftsstelle/members");
  revalidatePath("/geschaeftsstelle/funktionaere");
  revalidatePath("/geschaeftsstelle/stufenadmins");
  revalidatePath("/geschaeftsstelle/datenbank");
  return {
    created,
    updated,
    deactivated: missing.length,
    emailConflicts: emailConflicts.length > 0 ? emailConflicts : undefined,
  };
}
