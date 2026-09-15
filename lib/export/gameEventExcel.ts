import ExcelJS from "exceljs";
import { formatDate, formatTime } from "@/lib/format";

export type GameEventExportRow = {
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  beschrieb: string;
  startDateTime: Date;
  endDateTime: Date;
};

/**
 * Builds the Helferliste for a Spieleinsatz as a real .xlsx file: Titel gross
 * oben, Standort kleiner darunter, dann eine Tabelle mit einer Zeile pro
 * Helfer. Datum/Beginn/Ende/Dauer sind pro Rolle definiert (jede Zeile bringt
 * ihre eigene mit) statt für den ganzen Einsatz geteilt zu sein, da
 * unterschiedliche Rollen zu unterschiedlichen Zeiten stattfinden können —
 * genau wie der Einsatzbeschrieb.
 */
export async function buildGameEventExcel(params: {
  title: string;
  locationName: string | null;
  rows: GameEventExportRow[];
}): Promise<ExcelJS.Buffer> {
  const { title, locationName, rows } = params;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Helferliste");

  const columns = [
    "Datum",
    "Beginn",
    "Ende",
    "Dauer",
    "Einsatzbeschrieb",
    "Vorname",
    "Nachname",
    "Email",
    "Telefonnummer",
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
    const dauer =
      Math.round(((row.endDateTime.getTime() - row.startDateTime.getTime()) / (60 * 60 * 1000)) * 100) /
      100;
    sheet.addRow([
      formatDate(row.startDateTime),
      formatTime(row.startDateTime),
      formatTime(row.endDateTime),
      dauer,
      row.beschrieb,
      row.vorname,
      row.nachname,
      row.email,
      row.telefon,
    ]);
  }

  sheet.columns = [
    { width: 12 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 40 },
    { width: 16 },
    { width: 16 },
    { width: 28 },
    { width: 16 },
  ];

  return workbook.xlsx.writeBuffer();
}
