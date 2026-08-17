function escapeCsvField(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  delimiter = ";",
): string {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => escapeCsvField(String(cell ?? ""), delimiter)).join(delimiter),
  );
  // BOM so Excel on Windows/macOS detects UTF-8 correctly.
  return "﻿" + lines.join("\r\n");
}
