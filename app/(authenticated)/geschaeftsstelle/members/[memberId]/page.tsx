import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MemberEditForm } from "./MemberEditForm";
import { InviteLoginForm } from "./InviteLoginForm";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;

  const [member, ageGroups, signups] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId }, include: { user: true } }),
    prisma.ageGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.signup.findMany({
      where: { memberId, status: "CONFIRMED" },
      include: { shiftSlot: { include: { activity: true, event: true } } },
      orderBy: { shiftSlot: { event: { startDateTime: "desc" } } },
      take: 20,
    }),
  ]);

  if (!member) notFound();

  const memberUser = member.user;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h1 className="mb-3 flex items-center gap-2 text-base font-semibold text-text">
          {member.firstName} {member.lastName}
          {!member.isActive && <Badge variant="neutral">inaktiv — fehlt im letzten Import</Badge>}
        </h1>
        <MemberEditForm
          memberId={member.id}
          firstName={member.firstName}
          lastName={member.lastName}
          email={member.email ?? ""}
          phone={member.phone ?? ""}
          ageGroupId={member.ageGroupId}
          targetHours={Number(member.targetHours)}
          ageGroups={ageGroups}
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Login</h2>
        {memberUser && (
          <p className="mb-3 text-sm text-muted">
            Aktueller Login: {memberUser.email} · Rolle {memberUser.role}
            {!memberUser.isActive && (
              <>
                {" "}
                · <span className="text-status-open-text">deaktiviert</span>
              </>
            )}
          </p>
        )}
        <InviteLoginForm
          memberId={member.id}
          ageGroups={ageGroups}
          currentRole={memberUser?.role}
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Einsätze (letzte 20)
        </h2>
        <div className="flex flex-col">
          {signups.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-b-0"
            >
              <span>
                {s.shiftSlot.event.title} · {s.shiftSlot.activity.name}
              </span>
              <span className="flex items-center gap-2 text-muted">
                {s.shiftSlot.event.startDateTime.toLocaleDateString("de-CH")}
                {s.shiftSlot.event.isManualEntry && <Badge variant="neutral">manuell</Badge>}
                <Badge variant={s.payoutType === "HELFERKONTINGENT" ? "filled" : "neutral"}>
                  {s.payoutType}
                </Badge>
              </span>
            </div>
          ))}
          {signups.length === 0 && <p className="text-sm text-muted">Keine Einsätze bisher.</p>}
        </div>
      </Card>
    </div>
  );
}
