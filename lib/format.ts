const TIMEZONE = "Europe/Zurich";

export function formatDate(date: Date): string {
  return date.toLocaleDateString("de-CH", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("de-CH", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("de-CH", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
