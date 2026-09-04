import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { AdminShiftSlotRow, type AdminShiftSlotRowData } from "@/components/shifts/AdminShiftSlotRow";
import { formatDateTime } from "@/lib/format";

export function AdminEventCard({
  eventId,
  title,
  startDateTime,
  locationName,
  shiftSlots,
  allowDeleteSlots = false,
  detailHrefBase,
}: {
  eventId: string;
  title: string;
  startDateTime: Date;
  locationName: string | null;
  shiftSlots: AdminShiftSlotRowData[];
  allowDeleteSlots?: boolean;
  /** When provided, the title links to `${detailHrefBase}/${eventId}`. */
  detailHrefBase?: string;
}) {
  const formattedDate = formatDateTime(startDateTime);

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-text">
          {detailHrefBase ? (
            <Link href={`${detailHrefBase}/${eventId}`} className="hover:text-gold-hover">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
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
