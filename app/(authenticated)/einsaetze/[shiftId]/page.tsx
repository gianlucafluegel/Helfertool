import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isShiftSlotVisible } from "@/lib/visibility";
import {
  requiresWristbandPickupChoice,
  shiftRequiresPayoutChoice,
} from "@/lib/rules/signup-rules";
import { Card } from "@/components/ui/Card";
import { formatDateTime, formatTime } from "@/lib/format";
import { SignupForm } from "./SignupForm";

export default async function ShiftSignupPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const shiftSlot = await prisma.shiftSlot.findUnique({
    where: { id: shiftId },
    include: {
      activity: true,
      event: { include: { location: true } },
      ageGroupRestrictions: { include: { ageGroup: true } },
      signups: { where: { status: "CONFIRMED" } },
    },
  });

  if (!shiftSlot || shiftSlot.deletedAt || shiftSlot.event.deletedAt || shiftSlot.event.isManualEntry) {
    notFound();
  }

  const activeMember = session.user.member;
  if (!activeMember) {
    return <p className="text-sm text-status-open-text">Kein Mitgliedsprofil verknüpft.</p>;
  }

  if (!isShiftSlotVisible(shiftSlot, session.user.role)) {
    notFound();
  }

  if (shiftSlot.signups.length >= shiftSlot.capacity) {
    // Funktionär (and above) can click through to a filled Einsatz to see
    // who's doing it; a Mitglied only sees the generic "besetzt" message.
    const canViewOccupant = session.user.role !== "MITGLIED";

    return (
      <div className="flex flex-col gap-5">
        <Link href="/einsaetze" className="text-sm font-medium text-muted hover:text-navy">
          ← Zurück zu den Einsätzen
        </Link>
        <Card>
          <p className="text-sm text-status-open-text">
            Dieser Einsatz ist bereits vollständig besetzt.
          </p>
          {canViewOccupant && (
            <div className="mt-3 flex flex-col gap-3">
              {shiftSlot.signups.map((s) => (
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
        </Card>
      </div>
    );
  }

  const member = await prisma.member.findUnique({ where: { id: activeMember.id } });

  return (
    <div className="flex flex-col gap-5">
      <Link href="/einsaetze" className="text-sm font-medium text-muted hover:text-navy">
        ← Zurück zu den Einsätzen
      </Link>

      <Card>
        <h1 className="text-base font-semibold text-text">{shiftSlot.event.title}</h1>
        <p className="mb-1 text-sm text-muted">
          {formatDateTime(shiftSlot.event.startDateTime)}
          {shiftSlot.event.endDateTime &&
            ` – ${formatTime(shiftSlot.event.endDateTime)}`}{" "}
          Uhr
          {(shiftSlot.event.location?.name ?? shiftSlot.event.locationText) &&
            ` · ${shiftSlot.event.location?.name ?? shiftSlot.event.locationText}`}
        </p>
        <p className="mb-2 text-sm font-medium text-text">{shiftSlot.activity.name}</p>
        {shiftSlot.event.requirements && (
          <p className="text-sm text-muted">
            <span className="font-medium text-text">Anforderungen:</span>{" "}
            {shiftSlot.event.requirements}
          </p>
        )}
      </Card>

      <Card>
        <SignupForm
          shiftSlotId={shiftSlot.id}
          requiresPayoutChoice={shiftRequiresPayoutChoice(
            shiftSlot.activity.requiresPayoutChoice,
            shiftSlot.ageGroupRestrictions,
          )}
          requiresWristbandPickupChoice={requiresWristbandPickupChoice(shiftSlot.event.title)}
          defaultFirstName={activeMember.firstName}
          defaultLastName={activeMember.lastName}
          defaultEmail={member?.email ?? ""}
          defaultPhone={member?.phone ?? ""}
        />
      </Card>
    </div>
  );
}
