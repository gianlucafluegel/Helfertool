import { Card } from "@/components/ui/Card";
import { ShiftSlotRow, type ShiftSlotRowData } from "@/components/shifts/ShiftSlotRow";
import { formatDate } from "@/lib/format";

export function EventCard({
  title,
  date,
  locationName,
  shiftSlots,
  showOccupant,
  activeMemberId,
  allowSelfCancel,
  readOnly = false,
  canViewOccupant = false,
}: {
  title: string;
  date: Date;
  locationName: string | null;
  shiftSlots: ShiftSlotRowData[];
  showOccupant: boolean;
  activeMemberId: string | null;
  allowSelfCancel: boolean;
  readOnly?: boolean;
  canViewOccupant?: boolean;
}) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mb-2 text-sm text-muted">
        {formatDate(date)}
        {locationName ? ` · ${locationName}` : ""}
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
            canViewOccupant={canViewOccupant}
          />
        ))}
      </div>
    </Card>
  );
}
