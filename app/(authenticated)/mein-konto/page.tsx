import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CancelSignupButton } from "@/components/shifts/CancelSignupButton";

export default async function MeinKontoPage() {
  const session = await auth();
  if (!session?.user) return null;

  const activeMember = session.user.member;
  if (!activeMember) {
    return <p className="text-sm text-muted">Kein Mitgliedsprofil mit deinem Login verknüpft.</p>;
  }

  const season = await getCurrentSeason();
  if (!season) {
    return <p className="text-sm text-muted">Keine aktive Saison konfiguriert.</p>;
  }

  const [membership, signups] = await Promise.all([
    prisma.seasonMembership.findUnique({
      where: { memberId_seasonId: { memberId: activeMember.id, seasonId: season.id } },
    }),
    prisma.signup.findMany({
      where: { memberId: activeMember.id, status: "CONFIRMED" },
      include: {
        shiftSlot: {
          include: { activity: true, event: { include: { location: true } } },
        },
      },
      orderBy: { shiftSlot: { event: { startDateTime: "asc" } } },
    }),
  ]);

  const now = new Date();
  const upcoming = signups.filter((s) => s.shiftSlot.event.startDateTime >= now);
  const past = signups.filter((s) => s.shiftSlot.event.startDateTime < now);

  const targetHours = membership ? Number(membership.targetHours) : 0;
  const completedHours = past
    .filter((s) => s.payoutType === "HELFERKONTINGENT")
    .reduce((sum, s) => sum + Number(s.shiftSlot.creditHours), 0);
  const pct = targetHours > 0 ? Math.round((completedHours / targetHours) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h1 className="text-base font-semibold text-text">
          Helferstunden {activeMember.firstName} {activeMember.lastName}
        </h1>
        <p className="mb-3 text-sm text-muted">
          Saison {season.label} · Soll {targetHours} Std.
        </p>
        <ProgressBar value={pct} />
        <p className="mt-2 text-sm">
          <span className="font-semibold">{completedHours}</span> von {targetHours} Std. geleistet
          {targetHours > 0 ? ` (${pct}%)` : ""}
        </p>
        {targetHours > completedHours && (
          <p className="mt-1 text-sm text-status-open-text">
            Noch {(targetHours - completedHours).toFixed(1)} Std. offen bis Saisonende.
          </p>
        )}
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Anstehende Einsätze
        </h2>
        {upcoming.length === 0 && (
          <p className="text-sm text-muted">Keine anstehenden Einsätze.</p>
        )}
        <div className="flex flex-col gap-3">
          {upcoming.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text">{s.shiftSlot.event.title}</p>
                <p className="text-xs text-muted">
                  {s.shiftSlot.event.startDateTime.toLocaleString("de-CH", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  Uhr · {s.shiftSlot.activity.name}
                </p>
              </div>
              <CancelSignupButton signupId={s.id} />
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Geleistete Einsätze
        </h2>
        {past.length === 0 && <p className="text-sm text-muted">Noch keine geleisteten Einsätze.</p>}
        <div className="flex flex-col gap-3">
          {past.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text">{s.shiftSlot.event.title}</p>
                <p className="text-xs text-muted">
                  {s.shiftSlot.event.startDateTime.toLocaleDateString("de-CH")} ·{" "}
                  {s.shiftSlot.activity.name}
                </p>
              </div>
              <Badge variant={s.payoutType === "HELFERKONTINGENT" ? "filled" : "neutral"}>
                {s.payoutType === "HELFERKONTINGENT"
                  ? `${Number(s.shiftSlot.creditHours)} Std.`
                  : s.payoutType === "BARBEZUG"
                    ? "Barbezug"
                    : "Pauschale"}
              </Badge>
            </Card>
          ))}
        </div>
      </div>

      <Link href="/mein-konto/profil" className="text-sm font-medium text-gold-hover hover:underline">
        Kontaktdaten anpassen →
      </Link>
    </div>
  );
}
