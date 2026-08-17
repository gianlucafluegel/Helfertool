import { Card } from "@/components/ui/Card";
import { AdminShiftSlotRow, type AdminShiftSlotRowData } from "@/components/shifts/AdminShiftSlotRow";

export function AdminEventCard({
  eventId,
  title,
  startDateTime,
  locationName,
  shiftSlots,
  allowDeleteSlots = false,
}: {
  eventId: string;
  title: string;
  startDateTime: Date;
  locationName: string | null;
  shiftSlots: AdminShiftSlotRowData[];
  allowDeleteSlots?: boolean;
}) {
  const formattedDate = startDateTime.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-text">{title}</h3>
        <a
          href={`/api/exports/event/${eventId}`}
          className="text-xs font-medium text-gold-hover hover:underline"
        >
          Liste herunterladen
        </a>
      </div>
      <p className="mb-2 text-sm text-muted">
        {formattedDate} Uhr{locationName ? ` · ${locationName}` : ""}
      </p>
      <div>
        {shiftSlots.map((slot) => (
          <AdminShiftSlotRow
            key={slot.id}
            slot={slot}
            eventId={allowDeleteSlots ? eventId : undefined}
          />
        ))}
      </div>
    </Card>
  );
}
