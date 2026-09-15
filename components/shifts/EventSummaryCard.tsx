import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";

/**
 * Zusammenfassung eines Helfereinsatzes in der Übersichtsliste — nur Titel,
 * Standort und Datum des Einsatzes, bewusst ohne Zeit, da verschiedene
 * Rollen desselben Einsatzes zu unterschiedlichen Uhrzeiten stattfinden
 * können. Die Rollen selbst (mit eigener Zeit, Anzahl Helferstunden und
 * Anforderung) sieht man erst nach Klick auf der Detailseite, statt alle
 * inline in der Liste — bei grossen Events mit vielen Rollen bliebe die
 * Übersicht sonst unübersichtlich.
 */
export function EventSummaryCard({
  eventId,
  title,
  locationName,
  date,
}: {
  eventId: string;
  title: string;
  locationName: string | null;
  date: Date;
}) {
  return (
    <Link href={`/einsaetze/event/${eventId}`}>
      <Card className="transition-colors hover:border-navy/40">
        <h3 className="text-base font-semibold text-text">{title}</h3>
        <p className="text-sm text-muted">
          {formatDate(date)}
          {locationName ? ` · ${locationName}` : ""}
        </p>
      </Card>
    </Link>
  );
}
