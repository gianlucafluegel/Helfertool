import { Badge } from "@/components/ui/Badge";
import { AdminSignupRow } from "@/components/shifts/AdminSignupRow";
import { DeleteShiftSlotButton } from "@/components/shifts/DeleteShiftSlotButton";

export type AdminShiftSlotRowData = {
  id: string;
  area: "HELFER" | "FUNKTIONAER";
  capacity: number;
  activity: { name: string };
  ageGroupRestrictions: { ageGroup: { name: string } }[];
  signups: {
    id: string;
    helperFirstName: string;
    helperLastName: string;
    helperEmail: string;
    helperPhone: string | null;
  }[];
};

export function AdminShiftSlotRow({
  slot,
  eventId,
}: {
  slot: AdminShiftSlotRowData;
  eventId?: string;
}) {
  const isFull = slot.signups.length >= slot.capacity;
  const restrictionLabel = slot.ageGroupRestrictions.map((r) => r.ageGroup.name).join(", ");

  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={slot.area === "FUNKTIONAER" ? "funktionaer" : "helfer"}>
            {slot.area === "FUNKTIONAER" ? "Funktionär" : "Helfer"}
          </Badge>
          <div>
            <p className="text-sm font-medium text-text">{slot.activity.name}</p>
            {restrictionLabel && <p className="text-xs text-muted">Nur {restrictionLabel}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isFull ? "filled" : "open"}>
            {isFull ? "besetzt" : `offen (${slot.signups.length}/${slot.capacity})`}
          </Badge>
          {eventId && <DeleteShiftSlotButton eventId={eventId} shiftSlotId={slot.id} />}
        </div>
      </div>

      {slot.signups.length > 0 && (
        <div className="flex flex-col gap-2 pl-1">
          {slot.signups.map((s) => (
            <AdminSignupRow key={s.id} signup={s} />
          ))}
        </div>
      )}
    </div>
  );
}
