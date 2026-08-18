import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberAgeGroupId } from "@/lib/member";
import { isShiftSlotVisible } from "@/lib/visibility";
import { shiftRequiresPayoutChoice } from "@/lib/rules/signup-rules";
import { Card } from "@/components/ui/Card";
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

  if (!shiftSlot || shiftSlot.deletedAt || shiftSlot.event.deletedAt) {
    notFound();
  }

  const activeMember = session.user.member;
  if (!activeMember) {
    return <p className="text-sm text-status-open-text">Kein Mitgliedsprofil verknüpft.</p>;
  }

  const memberAgeGroupId = await getMemberAgeGroupId(activeMember.id, shiftSlot.event.seasonId);

  if (!isShiftSlotVisible(shiftSlot, session.user.role, memberAgeGroupId)) {
    notFound();
  }

  if (shiftSlot.signups.length >= shiftSlot.capacity) {
    return (
      <Card>
        <p className="text-sm text-status-open-text">
          Dieser Einsatz ist bereits vollständig besetzt.
        </p>
      </Card>
    );
  }

  const member = await prisma.member.findUnique({ where: { id: activeMember.id } });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h1 className="text-base font-semibold text-text">{shiftSlot.event.title}</h1>
        <p className="mb-1 text-sm text-muted">
          {shiftSlot.event.startDateTime.toLocaleString("de-CH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          Uhr{shiftSlot.event.location ? ` · ${shiftSlot.event.location.name}` : ""}
        </p>
        <p className="text-sm font-medium text-text">{shiftSlot.activity.name}</p>
      </Card>

      <Card>
        <SignupForm
          shiftSlotId={shiftSlot.id}
          requiresPayoutChoice={shiftRequiresPayoutChoice(
            shiftSlot.activity.requiresPayoutChoice,
            shiftSlot.ageGroupRestrictions,
          )}
          defaultFirstName={activeMember.firstName}
          defaultLastName={activeMember.lastName}
          defaultEmail={member?.email ?? ""}
          defaultPhone={member?.phone ?? ""}
        />
      </Card>
    </div>
  );
}
