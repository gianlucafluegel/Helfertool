import ExcelJS from "exceljs";
import { extractAgeNumber } from "./mysihf";

export type ParsedMemberRow = {
  contactId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  targetHours: number;
  /** Raw value of the roster's Team column (e.g. "U14", "3. Liga"), if present. */
  teamRaw: string | null;
  /** Base "U<n>" number extracted from the Team column, if present. */
  ageGroupNumber: number | null;
};

const REQUIRED_HEADERS = ["Kontakt-ID", "Vorname", "Nachname"] as const;

function cellString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  return String(value);
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "object" && "result" in value ? Number(value.result) : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parses the club's member/roster export ("...aktualisierungsexport
 * privatpersonen...xlsx"). The Sollstunden column's header varies by source
 * system (e.g. "Sollstunden (Saison 26/27)" for Nachwuchs, "Soll
 * Helferstunden 26-27" for Aktivmannschaften) and the Team column carries a
 * dynamic field-count suffix (e.g. "Teams [6/13]") — both matched by prefix
 * so export variations still parse. The raw Team value is kept as-is
 * (matched against the AgeGroup catalog by exact name first, e.g. "3. Liga")
 * and also normalised down to a bare "U<n>" number as a fallback (same rule
 * as the Helfereinsätze-Import), in case it ever carries a league-tier
 * suffix like "U14-Top".
 */
export async function parseMemberWorkbook(
  buffer: ArrayBuffer,
): Promise<{ rows: ParsedMemberRow[]; error?: string }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], error: "Die Excel-Datei enthält kein Arbeitsblatt." };
  }

  const headerRow = sheet.getRow(1);
  const headerIndex = new Map<string, number>();
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = cellString(cell.value).trim();
    if (header) headerIndex.set(header, colNumber);
  });

  const missing = REQUIRED_HEADERS.filter((h) => !headerIndex.has(h));
  if (missing.length > 0) {
    return {
      rows: [],
      error: `Die Datei entspricht nicht dem erwarteten Format. Fehlende Spalten: ${missing.join(", ")}.`,
    };
  }

  const emailCol = headerIndex.get("Primäre E-Mail") ?? headerIndex.get("E-Mail");
  const phoneCol = headerIndex.get("Handy") ?? headerIndex.get("Telefon") ?? headerIndex.get("Telefonnummer");
  // Matches both "Sollstunden (Saison 26/27)" (Nachwuchs) and "Soll
  // Helferstunden 26-27" (Aktivmannschaften) — both start with "soll".
  const sollstundenHeader = [...headerIndex.keys()].find((h) =>
    h.toLowerCase().startsWith("soll"),
  );
  const sollstundenCol = sollstundenHeader ? headerIndex.get(sollstundenHeader) : undefined;
  const teamHeader = [...headerIndex.keys()].find((h) => h.toLowerCase().startsWith("team"));
  const teamCol = teamHeader ? headerIndex.get(teamHeader) : undefined;
  const contactCol = headerIndex.get("Kontakt-ID")!;
  const firstNameCol = headerIndex.get("Vorname")!;
  const lastNameCol = headerIndex.get("Nachname")!;

  const rows: ParsedMemberRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const contactId = cellString(row.getCell(contactCol).value).trim();
    const firstName = cellString(row.getCell(firstNameCol).value).trim();
    const lastName = cellString(row.getCell(lastNameCol).value).trim();
    if (!contactId || !firstName || !lastName) return;

    const teamValue = teamCol ? cellString(row.getCell(teamCol).value).trim() : "";

    rows.push({
      contactId,
      email: emailCol ? cellString(row.getCell(emailCol).value).trim() : "",
      firstName,
      lastName,
      phone: phoneCol ? cellString(row.getCell(phoneCol).value).trim() : "",
      targetHours: (sollstundenCol ? cellNumber(row.getCell(sollstundenCol).value) : null) ?? 0,
      teamRaw: teamValue || null,
      ageGroupNumber: teamValue ? extractAgeNumber(teamValue) : null,
    });
  });

  return { rows };
}
