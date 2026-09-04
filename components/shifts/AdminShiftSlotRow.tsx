import { Badge } from "@/components/ui/Badge";
import { AdminSignupRow } from "@/components/shifts/AdminSignupRow";
import { DeleteShiftSlotButton } from "@/components/shifts/DeleteShiftSlotButton";
import { AssignMemberForm } from "@/components/shifts/AssignMemberForm";

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
  members,
}: {
  slot: AdminShiftSlotRowData;
  eventId?: string;
  /** Nur nötig, wenn eventId gesetzt ist (Geschäftsstelle-Kontext) — für die
   * direkte Zuordnung eines Mitglieds zu einer noch offenen Rolle. */
  members?: { id: string; firstName: string; lastName: string }[];
}) {
  const isFull = slot.signups.length >= slot.capacity;

  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={slot.area === "FUNKTIONAER" ? "funktionaer" : "helfer"}>
            {slot.area === "FUNKTIONAER" ? "Funktionär" : "Helfer"}
          </Badge>
          <div>
            <p className="text-sm font-medium text-text">{slot.activity.name}</p>
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

      {!isFull && eventId && members && (
        <div className="pl-1">
          <AssignMemberForm shiftSlotId={slot.id} members={members} />
        </div>
      )}
    </div>
  );
}
