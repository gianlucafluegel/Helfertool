"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { parseMysihfWorkbook, extractAgeNumber } from "@/lib/import/mysihf";
import { revalidatePath } from "next/cache";

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
  return session;
}

// Der MySIHF-Export enthält nur die Anspielzeit, keinen eigenen
// Einsatz-Zeitraum. Der Helfereinsatz beginnt deshalb standardmässig
// SETUP_MINUTES_BEFORE_KICKOFF vor Anspielzeit (Vorbereitung) und dauert
// dann DEFAULT_GAME_CREDIT_HOURS — Ende und Dauer werden daraus abgeleitet,
// nicht separat erfasst.
const SETUP_MINUTES_BEFORE_KICKOFF = 15;
const DEFAULT_GAME_CREDIT_HOURS = 2.5;

export type ImportPreviewRow = {
  spielNr: string;
  title: string;
  description: string;
  startDateTimeIso: string;
  endDateTimeIso: string;
  creditHours: number;
  cancelled: boolean;
  locationGuessId: string | null;
  ageGroupGuessId: string | null;
  willUpdate: boolean;
};

export type ImportPreviewState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "preview";
      rows: ImportPreviewRow[];
      locations: { id: string; name: string }[];
      ageGroups: { id: string; name: string }[];
    };

function locationMatches(locationText: string, locationName: string): boolean {
  const haystack = locationText.toLowerCase();
  return locationName
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .some((word) => haystack.includes(word));
}

export async function parseImportFile(
  prevState: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  await requireGeschaeftsstelle();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Bitte eine Excel-Datei auswählen." };
  }

  const [locations, ageGroups] = await Promise.all([
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.ageGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const buffer = await file.arrayBuffer();
  const { rows, error } = await parseMysihfWorkbook(buffer);
  if (error) {
    return { status: "error", message: error };
  }
  if (rows.length === 0) {
    return { status: "error", message: "Keine Spielzeilen in der Datei gefunden." };
  }

  const existing = await prisma.event.findMany({
    where: { externalRef: { in: rows.map((r) => r.spielNr) }, deletedAt: null },
    select: { externalRef: true },
  });
  const existingRefs = new Set(existing.map((e) => e.externalRef));

  const previewRows: ImportPreviewRow[] = rows.map((row) => {
    const locationGuess = locations.find((l) => locationMatches(row.locationText, l.name));
    const rowAgeNumber = extractAgeNumber(row.spielklasseHt);
    const ageGroupGuess = ageGroups.find(
      (ag) => rowAgeNumber !== null && extractAgeNumber(ag.name) === rowAgeNumber,
    );

    const shiftStart = new Date(
      row.startDateTime.getTime() - SETUP_MINUTES_BEFORE_KICKOFF * 60 * 1000,
    );
    const shiftEnd = new Date(shiftStart.getTime() + DEFAULT_GAME_CREDIT_HOURS * 60 * 60 * 1000);

    return {
      spielNr: row.spielNr,
      title: row.title,
      description: row.description,
      startDateTimeIso: shiftStart.toISOString(),
      endDateTimeIso: shiftEnd.toISOString(),
      creditHours: DEFAULT_GAME_CREDIT_HOURS,
      cancelled: row.cancelled,
      locationGuessId: locationGuess?.id ?? null,
      ageGroupGuessId: ageGroupGuess?.id ?? null,
      willUpdate: existingRefs.has(row.spielNr),
    };
  });

  return {
    status: "preview",
    rows: previewRows,
    locations: locations.map((l) => ({ id: l.id, name: l.name })),
    ageGroups: ageGroups.map((ag) => ({ id: ag.id, name: ag.name })),
  };
}

export async function commitImport(
  rows: {
    spielNr: string;
    title: string;
    description: string;
    startDateTimeIso: string;
    endDateTimeIso: string;
    creditHours: number;
    cancelled: boolean;
    locationId: string | null;
    ageGroupId: string | null;
  }[],
): Promise<{ error?: string; created?: number; updated?: number }> {
  const session = await requireGeschaeftsstelle();

  if (rows.length === 0) {
    return { error: "Keine Einsätze ausgewählt." };
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
    data: { source: "MySIHF Excel-Import", importedByUserId: session.user.id },
  });

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const existingEvent = await prisma.event.findFirst({
      where: { externalRef: row.spielNr, deletedAt: null },
    });

    if (existingEvent) {
      await prisma.event.update({
        where: { id: existingEvent.id },
        data: {
          title: row.title,
          description: row.description,
          startDateTime: new Date(row.startDateTimeIso),
          endDateTime: new Date(row.endDateTimeIso),
          locationId: row.locationId,
          status: row.cancelled ? "CANCELLED" : "SCHEDULED",
          importBatchId: batch.id,
        },
      });
      updated += 1;
    } else {
      await prisma.event.create({
        data: {
          seasonId: season.id,
          type: "GAME",
          title: row.title,
          description: row.description,
          startDateTime: new Date(row.startDateTimeIso),
          endDateTime: new Date(row.endDateTimeIso),
          locationId: row.locationId,
          status: row.cancelled ? "CANCELLED" : "SCHEDULED",
          externalRef: row.spielNr,
          importBatchId: batch.id,
          shiftSlots: {
            create: {
              activityId: defaultActivity.id,
              area: "HELFER",
              capacity: 1,
              creditHours: row.creditHours,
              ...(row.ageGroupId
                ? { ageGroupRestrictions: { create: { ageGroupId: row.ageGroupId } } }
                : {}),
            },
          },
        },
      });
      created += 1;
    }
  }

  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  revalidatePath("/geschaeftsstelle");
  return { created, updated };
}
