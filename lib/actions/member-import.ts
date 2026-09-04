"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseMemberWorkbook } from "@/lib/import/members";
import { extractAgeNumber } from "@/lib/import/mysihf";
import type { MemberCategory } from "@/generated/prisma/enums";

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
  phone: string;
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
      ageGroups: { id: string; name: string; category: MemberCategory }[];
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
      select: { externalContactId: true, category: true },
    }),
    prisma.ageGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  // Nachwuchs and Aktivmannschaften are separate source systems with
  // independent Kontakt-ID numbering, so the same Kontakt-ID can legitimately
  // belong to two different people. "willUpdate" must therefore check for an
  // existing Member with the same (Kontakt-ID, Kategorie) pair, not just the
  // same Kontakt-ID.
  const existingKeys = new Set(existing.map((e) => `${e.externalContactId}::${e.category ?? ""}`));

  return {
    status: "preview",
    rows: rows.map((r) => {
      // Exact name match first (covers Aktivmannschaften like "3. Liga",
      // which have no "U<n>" pattern to extract) — extractAgeNumber is only
      // a fallback for Nachwuchs rows carrying a league-tier suffix like
      // "U14-Top" that wouldn't exact-match the catalog's plain "U14".
      const exactMatch = r.teamRaw
        ? ageGroups.find((ag) => ag.name.toLowerCase() === r.teamRaw!.toLowerCase())
        : undefined;
      const numberMatch =
        !exactMatch && r.ageGroupNumber !== null
          ? ageGroups.find((ag) => extractAgeNumber(ag.name) === r.ageGroupNumber)
          : undefined;
      const ageGroupGuessId = exactMatch?.id ?? numberMatch?.id ?? null;
      const category = ageGroups.find((ag) => ag.id === ageGroupGuessId)?.category ?? null;
      return {
        contactId: r.contactId,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        phone: r.phone,
        targetHours: r.targetHours,
        ageGroupGuessId,
        willUpdate: existingKeys.has(`${r.contactId}::${category ?? ""}`),
      };
    }),
    ageGroups: ageGroups.map((ag) => ({ id: ag.id, name: ag.name, category: ag.category })),
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

  // Category is derived server-side from each row's (possibly admin-edited)
  // ageGroupId — never trusted from client input — since it decides which
  // existing Member this row is allowed to match/collide with.
  const ageGroupIds = [...new Set(rows.map((r) => r.ageGroupId).filter((id): id is string => !!id))];
  const ageGroups = ageGroupIds.length
    ? await prisma.ageGroup.findMany({ where: { id: { in: ageGroupIds } }, select: { id: true, category: true } })
    : [];
  const categoryByAgeGroupId = new Map(ageGroups.map((ag) => [ag.id, ag.category]));

  let created = 0;
  let updated = 0;
  const emailConflicts: string[] = [];
  const categoriesInFile = new Set<MemberCategory>();

  for (const row of rows) {
    const category = row.ageGroupId ? (categoryByAgeGroupId.get(row.ageGroupId) ?? null) : null;
    if (category) categoriesInFile.add(category);

    const existing = await prisma.member.findFirst({
      where: { externalContactId: row.contactId, category },
      include: { user: true },
    });

    const data = {
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email || null,
      phone: row.phone || null,
      ageGroupId: row.ageGroupId,
      category,
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
  //
  // Scoped to the Kategorie(n) actually present in this import batch: a
  // Nachwuchs-only file must never deactivate Aktiv members (and vice versa)
  // just because they're absent from a file that was never about them. If no
  // row resolved to a known category (e.g. no Stufe assigned to any row),
  // skip the sweep entirely rather than guess.
  let missing: { id: string; user: { id: string } | null }[] = [];
  if (categoriesInFile.size > 0) {
    missing = await prisma.member.findMany({
      where: {
        isActive: true,
        category: { in: [...categoriesInFile] },
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
