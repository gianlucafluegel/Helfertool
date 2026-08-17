import { Card } from "@/components/ui/Card";
import { ShiftSlotRow, type ShiftSlotRowData } from "@/components/shifts/ShiftSlotRow";

export function EventCard({
  title,
  startDateTime,
  locationName,
  shiftSlots,
  showOccupant,
  activeMemberId,
  allowSelfCancel,
  readOnly = false,
}: {
  title: string;
  startDateTime: Date;
  locationName: string | null;
  shiftSlots: ShiftSlotRowData[];
  showOccupant: boolean;
  activeMemberId: string | null;
  allowSelfCancel: boolean;
  readOnly?: boolean;
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
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mb-2 text-sm text-muted">
        {formattedDate} Uhr{locationName ? ` · ${locationName}` : ""}
      </p>
      <div>
        {shiftSlots.map((slot) => (
          <ShiftSlotRow
            key={slot.id}
            slot={slot}
            showOccupant={showOccupant}
            activeMemberId={activeMemberId}
            allowSelfCancel={allowSelfCancel}
            readOnly={readOnly}
          />
        ))}
      </div>
    </Card>
  );
}
