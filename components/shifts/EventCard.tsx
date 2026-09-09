import { Card } from "@/components/ui/Card";
import { ShiftSlotRow, type ShiftSlotRowData } from "@/components/shifts/ShiftSlotRow";
import { formatDateTime, formatTime } from "@/lib/format";

export function EventCard({
  title,
  startDateTime,
  endDateTime,
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
  endDateTime?: Date | null;
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
  // Die Anzahl Helferstunden ergibt sich immer aus Start/Ende des Einsatzes
  // und ist deshalb für alle Rollen desselben Einsatzes identisch — hier
  // reicht der Wert der ersten Rolle.
  const creditHours = shiftSlots[0]?.creditHours;

  return (
    <Card>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mb-2 text-sm text-muted">
        {formattedDate}
        {endDateTime && ` – ${formatTime(endDateTime)}`} Uhr
        {creditHours ? ` · ${creditHours} Std.` : ""}
        {locationName ? ` · ${locationName}` : ""}
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
