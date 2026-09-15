"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { parseExternalEventsWorkbook, combineDatumZeit } from "@/lib/import/external-events";

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
  return session;
}

export type ExternalEventGroupPreview = {
  key: string;
  description: string;
  requirements: string | null;
  startDateTimeIso: string;
  endDateTimeIso: string;
  creditHours: number;
  roleCount: number;
};

export type ExternalEventsImportPreviewState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "preview"; title: string; locationText: string; groups: ExternalEventGroupPreview[] };

export async function parseExternalEventsImportFile(
  prevState: ExternalEventsImportPreviewState,
  formData: FormData,
): Promise<ExternalEventsImportPreviewState> {
  await requireGeschaeftsstelle();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Bitte eine Excel-Datei auswählen." };
  }

  const buffer = await file.arrayBuffer();
  const { file: parsed, error } = await parseExternalEventsWorkbook(buffer);
  if (error || !parsed) {
    return { status: "error", message: error ?? "Datei konnte nicht gelesen werden." };
  }
  if (parsed.rows.length === 0) {
    return { status: "error", message: "Keine Rollen-Zeilen in der Datei gefunden." };
  }

  // Zeilen mit identischem Start/Ende, Einsatzbeschrieb UND Anzahl
  // Helferstunden bilden zusammen einen Helfereinsatz mit mehreren Rollen —
  // unterschiedliche Einsatzbeschriebe (oder eine abweichende Std.-Zahl)
  // bleiben auch bei gleicher Zeit getrennte Einsätze (z.B. "Brückli
  // südlich" und "Einweiser" zur selben Zeit).
  const groups = new Map<
    string,
    {
      startDateTime: Date;
      endDateTime: Date;
      einsatzbeschrieb: string;
      anforderungen: string | null;
      helferstunden: number;
      roleCount: number;
    }
  >();

  for (const row of parsed.rows) {
    const startDateTime = combineDatumZeit(row.datum, row.beginn);
    let endDateTime = combineDatumZeit(row.datum, row.ende);
    if (endDateTime <= startDateTime) {
      endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
    }

    const key = `${startDateTime.toISOString()}|${endDateTime.toISOString()}|${row.einsatzbeschrieb}|${row.helferstunden}`;
    const existing = groups.get(key);
    if (existing) {
      existing.roleCount += 1;
    } else {
      groups.set(key, {
        startDateTime,
        endDateTime,
        einsatzbeschrieb: row.einsatzbeschrieb,
        anforderungen: row.anforderungen,
        helferstunden: row.helferstunden,
        roleCount: 1,
      });
    }
  }

  const previewGroups: ExternalEventGroupPreview[] = [...groups.entries()].map(([key, g]) => ({
    key,
    description: g.einsatzbeschrieb,
    requirements: g.anforderungen,
    startDateTimeIso: g.startDateTime.toISOString(),
    endDateTimeIso: g.endDateTime.toISOString(),
    creditHours: g.helferstunden,
    roleCount: g.roleCount,
  }));

  previewGroups.sort((a, b) => a.startDateTimeIso.localeCompare(b.startDateTimeIso));

  return { status: "preview", title: parsed.title, locationText: parsed.locationText, groups: previewGroups };
}

/**
 * Erstellt EIN Event für die ganze Datei (Titel/Ort kommen aus Zeile 1/2 der
 * Vorlage, gelten für das ganze Dokument) mit einer Rolle pro Gruppe — statt
 * wie früher einem Event pro Gruppe. So entstehen bei einem grossen externen
 * Event mit vielen unterschiedlich terminierten Rollen (z.B. ein Festival)
 * nicht dutzende separate Helfereinsätze, sondern einer mit entsprechend
 * vielen Rollen.
 */
export async function commitExternalEventsImport(
  title: string,
  locationText: string,
  groups: ExternalEventGroupPreview[],
): Promise<{ error?: string; roleCount?: number }> {
  const session = await requireGeschaeftsstelle();

  if (groups.length === 0) {
    return { error: "Keine Rollen ausgewählt." };
  }

  const season = await getCurrentSeason();
  if (!season) {
    return { error: "Keine aktive Saison konfiguriert." };
  }

  const defaultActivity = await prisma.activity.findFirst({
    where: { name: "Helfer (allgemein)" },
  });
  if (!defaultActivity) {
    return {
      error:
        "Standard-Tätigkeit 'Helfer (allgemein)' nicht gefunden. Bitte Geschäftsstelle kontaktieren.",
    };
  }

  const batch = await prisma.importBatch.create({
    data: { source: "Externe-Events Excel-Import", importedByUserId: session.user.id },
  });

  await prisma.event.create({
    data: {
      seasonId: season.id,
      type: "EXTERNAL",
      title,
      locationText,
      importBatchId: batch.id,
      shiftSlots: {
        create: groups.map((group) => ({
          activityId: defaultActivity.id,
          area: "HELFER" as const,
          capacity: group.roleCount,
          creditHours: group.creditHours,
          description: group.description,
          requirements: group.requirements,
          startDateTime: new Date(group.startDateTimeIso),
          endDateTime: new Date(group.endDateTimeIso),
        })),
      },
    },
  });

  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  revalidatePath("/geschaeftsstelle");
  return { roleCount: groups.length };
}
