import { Card } from "@/components/ui/Card";
import { ShiftSlotRow, type ShiftSlotRowData } from "@/components/shifts/ShiftSlotRow";
import { formatDateTime } from "@/lib/format";

export function EventCard({
  title,
  startDateTime,
  locationName,
  requirements,
  shiftSlots,
  showOccupant,
  activeMemberId,
  allowSelfCancel,
  readOnly = false,
  canViewOccupant = false,
}: {
  title: string;
  startDateTime: Date;
  locationName: string | null;
  requirements?: string | null;
  shiftSlots: ShiftSlotRowData[];
  showOccupant: boolean;
  activeMemberId: string | null;
  allowSelfCancel: boolean;
  readOnly?: boolean;
  canViewOccupant?: boolean;
}) {
  const formattedDate = formatDateTime(startDateTime);

  return (
    <Card>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mb-2 text-sm text-muted">
        {formattedDate} Uhr{locationName ? ` · ${locationName}` : ""}
      </p>
      {requirements && (
        <p className="mb-2 text-sm text-muted">
          <span className="font-medium text-text">Anforderungen:</span> {requirements}
        </p>
      )}
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
