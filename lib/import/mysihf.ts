import ExcelJS from "exceljs";

export type ParsedGameRow = {
  spielNr: string;
  title: string;
  description: string;
  startDateTime: Date;
  cancelled: boolean;
  spielklasseHt: string | null;
  locationText: string;
  heimteam: string;
  gastteam: string;
};

const REQUIRED_HEADERS = ["# Spiel", "Datum/Anspielzeit", "Heimteam", "Gastteam"] as const;

function cellString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  return String(value);
}

/**
 * Parses a MySIHF "Spielgelegenheiten"/game-schedule export. Column lookup is
 * by header name (row 1), not position, so minor export variations (column
 * reordering, extra columns) don't break parsing.
 */
export async function parseMysihfWorkbook(
  buffer: ArrayBuffer,
): Promise<{ rows: ParsedGameRow[]; error?: string }> {
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
      error: `Die Datei entspricht nicht dem erwarteten MySIHF-Format. Fehlende Spalten: ${missing.join(", ")}.`,
    };
  }

  const get = (row: ExcelJS.Row, header: string): ExcelJS.CellValue => {
    const col = headerIndex.get(header);
    return col ? row.getCell(col).value : null;
  };

  const rows: ParsedGameRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const spielNr = cellString(get(row, "# Spiel")).trim();
    const dateValue = get(row, "Datum/Anspielzeit");
    if (!spielNr || !(dateValue instanceof Date)) return;

    const heimteam = cellString(get(row, "Heimteam")).trim();
    const gastteam = cellString(get(row, "Gastteam")).trim();
    const spielklasseHt = cellString(get(row, "Spielklasse HT")).trim() || null;
    const spieltyp = cellString(get(row, "Spieltyp")).trim();
    const turnier = cellString(get(row, "Turnier")).trim();
    const srHerkunft = cellString(get(row, "SR-Herkunft")).trim();
    const srAufbietung = cellString(get(row, "SR-Aufbietungsstelle")).trim();
    const resultat = cellString(get(row, "Resultat")).trim();
    const eisbahn = cellString(get(row, "Eisbahn")).trim();
    const ortEisbahn = cellString(get(row, "Ort Eisbahn")).trim();
    const spielstatus = cellString(get(row, "Spielstatus")).trim();

    // MySIHF's Spielklasse is a league-tier label ("U15-Top", "U21-A", ...)
    // more granular than our club's Stufen — only the bare "U<n>" survives
    // into the title, never the "-Top"/"-A" suffix.
    const ageNumber = extractAgeNumber(spielklasseHt);
    const stufeLabel = ageNumber !== null ? `U${ageNumber}` : spielklasseHt;

    const title = stufeLabel
      ? `${stufeLabel} · ${heimteam} – ${gastteam}`
      : `${heimteam} – ${gastteam}`;

    const descriptionParts = [
      [spieltyp, turnier].filter(Boolean).join(", "),
      srHerkunft || srAufbietung
        ? `Schiedsrichter: ${[srHerkunft, srAufbietung].filter(Boolean).join(" / ")}`
        : null,
      resultat ? `Resultat: ${resultat}` : null,
      `MySIHF-Spiel-Nr. ${spielNr}`,
    ].filter(Boolean);

    rows.push({
      spielNr,
      title,
      description: descriptionParts.join(" · "),
      startDateTime: dateValue,
      cancelled: spielstatus.toLowerCase() === "abgesagt",
      spielklasseHt,
      locationText: [eisbahn, ortEisbahn].filter(Boolean).join(" "),
      heimteam,
      gastteam,
    });
  });

  return { rows };
}

/**
 * Extracts the leading "U<number>" age prefix (e.g. "U14-Top" -> 14,
 * "U21-A" -> 21) so MySIHF's league-tier names (which are more granular
 * than our club's Stufen) can still be matched to the right Stufe — and so
 * the title only ever shows the bare "U14"/"U21", never the "-Top"/"-A"
 * league-tier suffix.
 */
export function extractAgeNumber(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/U(\d+)/i);
  return match ? Number(match[1]) : null;
}
