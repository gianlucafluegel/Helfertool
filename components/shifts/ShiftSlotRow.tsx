import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CancelSignupButton } from "@/components/shifts/CancelSignupButton";

export type ShiftSlotRowData = {
  id: string;
  area: "HELFER" | "FUNKTIONAER";
  capacity: number;
  activity: { name: string };
  ageGroupRestrictions: { ageGroup: { name: string } }[];
  signups: {
    id: string;
    memberId: string;
    helperFirstName: string;
    helperLastName: string;
    helperEmail: string;
    helperPhone: string | null;
  }[];
};

export function ShiftSlotRow({
  slot,
  showOccupant,
  activeMemberId,
  allowSelfCancel,
  readOnly = false,
  canViewOccupant = false,
}: {
  slot: ShiftSlotRowData;
  showOccupant: boolean;
  activeMemberId: string | null;
  allowSelfCancel: boolean;
  readOnly?: boolean;
  /** Funktionär (and above): can click into an already-filled Einsatz to see who's doing it. */
  canViewOccupant?: boolean;
}) {
  const filledCount = slot.signups.length;
  const isFull = filledCount >= slot.capacity;
  const mySignup = activeMemberId
    ? slot.signups.find((s) => s.memberId === activeMemberId)
    : undefined;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={slot.area === "FUNKTIONAER" ? "funktionaer" : "helfer"}>
          {slot.area === "FUNKTIONAER" ? "Funktionär" : "Helfer"}
        </Badge>
        <div>
          <p className="text-sm font-medium text-text">{slot.activity.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={isFull ? "filled" : "open"}>
          {isFull
            ? slot.capacity > 1
              ? `besetzt (${filledCount}/${slot.capacity})`
              : "besetzt"
            : slot.capacity > 1
              ? `offen (${filledCount}/${slot.capacity})`
              : "offen"}
        </Badge>

        {showOccupant && filledCount > 0 && (
          <div className="flex flex-col gap-2">
            {slot.signups.map((s) => (
              <div key={s.id} className="flex flex-col">
                <p className="text-base font-semibold text-text">
                  {s.helperFirstName} {s.helperLastName}
                </p>
                <p className="text-sm text-muted">{s.helperEmail}</p>
                {s.helperPhone && <p className="text-sm text-muted">{s.helperPhone}</p>}
              </div>
            ))}
          </div>
        )}

        {readOnly ? null : mySignup && allowSelfCancel ? (
          <CancelSignupButton signupId={mySignup.id} />
        ) : !isFull && !mySignup ? (
          <Link
            href={`/einsaetze/${slot.id}`}
            className="rounded-full bg-gold px-3.5 py-1.5 text-sm font-semibold text-navy hover:bg-gold-hover"
          >
            Übernehmen
          </Link>
        ) : isFull && !mySignup && canViewOccupant ? (
          <Link
            href={`/einsaetze/${slot.id}`}
            className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-medium text-text hover:border-navy/40"
          >
            Ansehen
          </Link>
        ) : null}
      </div>
    </div>
  );
}
