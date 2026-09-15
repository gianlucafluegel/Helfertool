"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { parseExternalEventsWorkbook, combineDatumZeit } from "@/lib/import/external-events";

/** Tag (lokale Zeit, Uhrzeit auf Mitternacht) eines Zeitpunkts — für Event.date. */
function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
  return session;
}

export type ExternalEventGroupPreview = {
  key: string;
  activityName: string;
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

  // Zeilen mit identischer Zeit, Tätigkeit UND Einsatzbeschrieb (und Anzahl
  // Helferstunden) bilden zusammen eine Rolle mit mehreren Plätzen —
  // unterschiedliche Tätigkeiten/Einsatzbeschriebe (oder eine abweichende
  // Std.-Zahl) bleiben auch bei gleicher Zeit getrennte Rollen (z.B.
  // "Aufbau" und "Bar" zur selben Zeit).
  const groups = new Map<
    string,
    {
      startDateTime: Date;
      endDateTime: Date;
      taetigkeit: string;
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

    const key = `${startDateTime.toISOString()}|${endDateTime.toISOString()}|${row.taetigkeit}|${row.einsatzbeschrieb}|${row.helferstunden}`;
    const existing = groups.get(key);
    if (existing) {
      existing.roleCount += 1;
    } else {
      groups.set(key, {
        startDateTime,
        endDateTime,
        taetigkeit: row.taetigkeit,
        einsatzbeschrieb: row.einsatzbeschrieb,
        anforderungen: row.anforderungen,
        helferstunden: row.helferstunden,
        roleCount: 1,
      });
    }
  }

  const previewGroups: ExternalEventGroupPreview[] = [...groups.entries()].map(([key, g]) => ({
    key,
    activityName: g.taetigkeit,
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
 * Erstellt ein Event pro Tag (Titel/Ort kommen aus Zeile 1/2 der Vorlage,
 * gelten für das ganze Dokument), mit je einer Rolle pro Gruppe dieses
 * Tages. Ein Einsatz hat immer genau ein Datum (Event.date), deshalb
 * müssen Gruppen an unterschiedlichen Tagen auf separate Events aufgeteilt
 * werden — bei einem eintägigen Dokument entsteht dadurch weiterhin nur
 * ein einziges Event. Mehrere Events dürfen denselben Titel tragen
 * (unterschieden durch ihr Datum), der Titel wird deshalb nicht verändert.
 * Die Tätigkeit kommt pro Rolle aus der Excel-Spalte — wird per Namen eine
 * bestehende Activity wiederverwendet oder neu angelegt, wie bei den
 * manuellen Erfassungsformularen.
 */
export async function commitExternalEventsImport(
  title: string,
  locationText: string,
  groups: ExternalEventGroupPreview[],
): Promise<{ error?: string; eventCount?: number; roleCount?: number }> {
  const session = await requireGeschaeftsstelle();

  if (groups.length === 0) {
    return { error: "Keine Rollen ausgewählt." };
  }

  const season = await getCurrentSeason();
  if (!season) {
    return { error: "Keine aktive Saison konfiguriert." };
  }

  const activityByName = new Map<string, string>();
  for (const activityName of new Set(groups.map((g) => g.activityName))) {
    const activity = await prisma.activity.upsert({
      where: { name: activityName },
      update: {},
      create: { name: activityName },
    });
    activityByName.set(activityName, activity.id);
  }

  const byDay = new Map<string, { date: Date; groups: ExternalEventGroupPreview[] }>();
  for (const group of groups) {
    const date = toDateOnly(new Date(group.startDateTimeIso));
    const dayKey = date.toISOString();
    const existing = byDay.get(dayKey);
    if (existing) existing.groups.push(group);
    else byDay.set(dayKey, { date, groups: [group] });
  }
  const days = [...byDay.values()].sort((a, b) => a.date.getTime() - b.date.getTime());

  const batch = await prisma.importBatch.create({
    data: { source: "Externe-Events Excel-Import", importedByUserId: session.user.id },
  });

  for (const day of days) {
    await prisma.event.create({
      data: {
        seasonId: season.id,
        type: "EXTERNAL",
        title,
        locationText,
        date: day.date,
        importBatchId: batch.id,
        shiftSlots: {
          create: day.groups.map((group) => ({
            activityId: activityByName.get(group.activityName)!,
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
  }

  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  revalidatePath("/geschaeftsstelle");
  return { eventCount: days.length, roleCount: groups.length };
}
