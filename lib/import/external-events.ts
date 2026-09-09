import ExcelJS from "exceljs";

export type ParsedExternalEventRow = {
  datum: Date;
  beginn: Date;
  ende: Date;
  helferstunden: number;
  einsatzbeschrieb: string;
  anforderungen: string | null;
};

export type ParsedExternalEventsFile = {
  title: string;
  locationText: string;
  rows: ParsedExternalEventRow[];
};

const REQUIRED_HEADERS = [
  "Datum",
  "Beginn",
  "Ende (ca.)",
  "Anzahl Helferstunden",
  "Einsatzbeschrieb",
] as const;

function cellString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  return String(value);
}

function cellDate(value: ExcelJS.CellValue): Date | null {
  return value instanceof Date ? value : null;
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Parses the club's fixed "Externe Events"-Vorlage: Zeile 1 = Titel des
 * gesamten Dokuments, Zeile 2 = Ort (Freitext, für alle Events in der Datei
 * identisch), Zeile 3 leer, Zeile 4 = Tabellenkopf, ab Zeile 5 eine Zeile pro
 * Rolle. Anders als beim MySIHF-Import sind die ersten Zeilen also fixe
 * Metadaten statt eines Tabellenkopfs — die Spalten selbst werden trotzdem
 * per Name gesucht (ab Zeile 4), damit eine andere Spaltenreihenfolge nicht
 * bricht.
 */
export async function parseExternalEventsWorkbook(
  buffer: ArrayBuffer,
): Promise<{ file: ParsedExternalEventsFile | null; error?: string }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { file: null, error: "Die Excel-Datei enthält kein Arbeitsblatt." };
  }

  const title = cellString(sheet.getRow(1).getCell(1).value).trim();
  const locationText = cellString(sheet.getRow(2).getCell(1).value).trim();
  if (!title || !locationText) {
    return {
      file: null,
      error:
        "Die Datei entspricht nicht dem erwarteten Format. Zeile 1 muss den Titel, Zeile 2 den Ort enthalten.",
    };
  }

  const headerRow = sheet.getRow(4);
  const headerIndex = new Map<string, number>();
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = cellString(cell.value).trim();
    if (header) headerIndex.set(header, colNumber);
  });

  const missing = REQUIRED_HEADERS.filter((h) => !headerIndex.has(h));
  if (missing.length > 0) {
    return {
      file: null,
      error: `Die Datei entspricht nicht dem erwarteten Format. Fehlende Spalten in Zeile 4: ${missing.join(", ")}.`,
    };
  }

  const get = (row: ExcelJS.Row, header: string): ExcelJS.CellValue => {
    const col = headerIndex.get(header);
    return col ? row.getCell(col).value : null;
  };

  const rows: ParsedExternalEventRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 4) return;

    const datum = cellDate(get(row, "Datum"));
    const beginn = cellDate(get(row, "Beginn"));
    const ende = cellDate(get(row, "Ende (ca.)"));
    const helferstunden = cellNumber(get(row, "Anzahl Helferstunden"));
    const einsatzbeschrieb = cellString(get(row, "Einsatzbeschrieb")).trim();
    if (!datum || !beginn || !ende || helferstunden === null || !einsatzbeschrieb) return;

    const anforderungen = cellString(get(row, "Anforderungen")).trim() || null;

    rows.push({ datum, beginn, ende, helferstunden, einsatzbeschrieb, anforderungen });
  });

  return { file: { title, locationText, rows } };
}

/**
 * Kombiniert ein "Datum"-Feld (echtes Kalenderdatum) mit einem "Beginn"/
 * "Ende"-Feld (reine Uhrzeit, von Excel als Zeit ab dessen Nullpunkt
 * 1899-12-30 gespeichert) zu einem Zeitstempel — beide über ihre UTC-
 * Komponenten gelesen, da ExcelJS zeitzonenlose Excel-Werte so ablegt
 * (gleiche Konvention wie beim MySIHF-Import).
 */
export function combineDatumZeit(datum: Date, zeit: Date): Date {
  return new Date(
    Date.UTC(
      datum.getUTCFullYear(),
      datum.getUTCMonth(),
      datum.getUTCDate(),
      zeit.getUTCHours(),
      zeit.getUTCMinutes(),
    ),
  );
}
