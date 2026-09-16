import ExcelJS from "exceljs";
import { formatDate, formatTime } from "@/lib/format";

export type HelferlisteExportRow = {
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  taetigkeit: string;
  stufe: string;
  creditHours: number;
  startDateTime: Date;
  endDateTime: Date;
  /** Nur für Trucker-Festival-Einsätze gesetzt (siehe requiresWristbandPickupChoice). */
  armbandAbholen?: string | null;
};

/**
 * Builds the Helferliste für einen Helfereinsatz (Spiel oder externes Event
 * — beide teilen sich dasselbe Format) als .xlsx: Titel gross oben,
 * Standort kleiner darunter, dann eine Tabelle mit einer Zeile pro Helfer.
 * Datum/Beginn/Ende/Anzahl Helferstunden/Tätigkeit sind pro Rolle definiert
 * (jede Zeile bringt ihre eigene mit) statt für den ganzen Einsatz geteilt
 * zu sein, da unterschiedliche Rollen zu unterschiedlichen Zeiten
 * stattfinden können. Die "Armband abholen"-Spalte erscheint nur bei
 * Einsätzen, die das erfordern (Sonderfall Truckerfestival).
 */
export async function buildHelferlisteExcel(params: {
  title: string;
  locationName: string | null;
  includeWristbandColumn: boolean;
  rows: HelferlisteExportRow[];
}): Promise<ExcelJS.Buffer> {
  const { title, locationName, includeWristbandColumn, rows } = params;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Helferliste");

  const columns = [
    "Datum",
    "Beginn",
    "Ende",
    "Anzahl Helferstunden",
    "Tätigkeit",
    "Stufe",
    "Vorname",
    "Nachname",
    "Email",
    "Telefonnummer",
    ...(includeWristbandColumn ? ["Armband abholen"] : []),
  ];
  const lastCol = String.fromCharCode("A".charCodeAt(0) + columns.length - 1);

  sheet.mergeCells(`A1:${lastCol}1`);
  const titleCell = sheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { size: 18, bold: true };

  sheet.mergeCells(`A2:${lastCol}2`);
  const locationCell = sheet.getCell("A2");
  locationCell.value = locationName ?? "";
  locationCell.font = { size: 11, color: { argb: "FF666666" } };

  sheet.addRow([]);

  const tableHeaderRow = sheet.addRow(columns);
  tableHeaderRow.font = { bold: true };
  tableHeaderRow.eachCell((cell) => {
    cell.border = { bottom: { style: "thin" } };
  });

  for (const row of rows) {
    sheet.addRow([
      formatDate(row.startDateTime),
      formatTime(row.startDateTime),
      formatTime(row.endDateTime),
      row.creditHours,
      row.taetigkeit,
      row.stufe,
      row.vorname,
      row.nachname,
      row.email,
      row.telefon,
      ...(includeWristbandColumn ? [row.armbandAbholen ?? ""] : []),
    ]);
  }

  sheet.columns = [
    { width: 12 },
    { width: 8 },
    { width: 8 },
    { width: 12 },
    { width: 28 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 28 },
    { width: 16 },
    ...(includeWristbandColumn ? [{ width: 20 }] : []),
  ];

  return workbook.xlsx.writeBuffer();
}
