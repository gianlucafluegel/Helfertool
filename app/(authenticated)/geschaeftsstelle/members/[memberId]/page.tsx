import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MemberEditForm } from "./MemberEditForm";
import { InviteLoginForm } from "./InviteLoginForm";
import { ManualHoursForm } from "./ManualHoursForm";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const season = await getCurrentSeason();

  const [member, ageGroups, locations, activities, signups] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      include: {
        seasonMemberships: { where: { seasonId: season?.id ?? "__no-season__" } },
        user: true,
      },
    }),
    prisma.ageGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.activity.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.signup.findMany({
      where: { memberId, status: "CONFIRMED" },
      include: { shiftSlot: { include: { activity: true, event: true } } },
      orderBy: { shiftSlot: { event: { startDateTime: "desc" } } },
      take: 20,
    }),
  ]);

  if (!member) notFound();

  const membership = member.seasonMemberships[0];
  const memberUser = member.user;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h1 className="mb-3 text-base font-semibold text-text">
          {member.firstName} {member.lastName}
        </h1>
        <MemberEditForm
          memberId={member.id}
          firstName={member.firstName}
          lastName={member.lastName}
          email={member.email ?? ""}
          phone={member.phone ?? ""}
          ageGroupId={membership?.ageGroupId ?? ""}
          targetHours={membership ? Number(membership.targetHours) : 0}
          ageGroups={ageGroups}
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Login</h2>
        {memberUser && (
          <p className="mb-3 text-sm text-muted">
            Aktueller Login: {memberUser.email} · Rolle {memberUser.role}
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
          Helferstunden manuell hinzufügen
        </h2>
        <p className="mb-3 text-sm text-muted">
          Für einen Einsatz, der nicht über das Tool lief (z.B. vor Systemstart oder nachträglich
          korrigiert) — dieselben Angaben wie beim Erstellen eines Helfereinsatzes.
        </p>
        <ManualHoursForm memberId={member.id} locations={locations} activities={activities} />
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
