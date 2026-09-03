import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type ArchivedSignup = {
  id: string;
  helperFirstName: string;
  helperLastName: string;
  payoutType: string;
  status: string;
};

type ArchivedShiftSlot = {
  id: string;
  activityName: string;
  area: string;
  capacity: number;
  creditHours: number;
  ageGroupRestrictions: string[];
  signups: ArchivedSignup[];
};

type ArchivedEvent = {
  id: string;
  title: string;
  locationName: string | null;
  startDateTime: string;
  isManualEntry: boolean;
  shiftSlots: ArchivedShiftSlot[];
};

type ArchivedMember = {
  id: string;
  externalContactId: string | null;
  firstName: string;
  lastName: string;
  ageGroupName: string | null;
  targetHours: number;
  completedHours: number;
};

type SeasonArchiveData = {
  seasonLabel: string;
  archivedAt: string;
  members: ArchivedMember[];
  events: ArchivedEvent[];
};

export default async function SeasonArchiveDetailPage({
  params,
}: {
  params: Promise<{ archiveId: string }>;
}) {
  const { archiveId } = await params;
  const archive = await prisma.seasonArchive.findUnique({ where: { id: archiveId } });
  if (!archive) notFound();

  const data = archive.data as unknown as SeasonArchiveData;
  const realEvents = data.events.filter((e) => !e.isManualEntry);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/geschaeftsstelle/datenbank" className="text-sm font-medium text-muted hover:text-navy">
          ← Zurück zur Datenbank
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-navy">Saison {data.seasonLabel} (archiviert)</h1>
        <p className="text-sm text-muted">
          Archiviert am {new Date(data.archivedAt).toLocaleDateString("de-CH")} · {data.members.length}{" "}
          Mitglieder · {realEvents.length} Helfereinsätze — nur lesbar.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Mitglieder & Helferstunden
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="py-2 pr-3">Kontakt-ID</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Team</th>
                <th className="py-2 pr-3">Soll-Std.</th>
                <th className="py-2 pr-3">Geleistet</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-b-0">
                  <td className="py-2 pr-3">{m.externalContactId ?? "–"}</td>
                  <td className="py-2 pr-3">
                    {m.firstName} {m.lastName}
                  </td>
                  <td className="py-2 pr-3">{m.ageGroupName ?? "–"}</td>
                  <td className="py-2 pr-3">{m.targetHours}</td>
                  <td className="py-2 pr-3">{m.completedHours}</td>
                </tr>
              ))}
              {data.members.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted">
                    Keine Mitglieder in dieser Saison.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Helfereinsätze
        </h2>
        <div className="flex flex-col gap-4">
          {realEvents.map((e) => (
            <div key={e.id} className="border-b border-border pb-4 last:border-b-0">
              <p className="font-medium text-text">{e.title}</p>
              <p className="mb-2 text-xs text-muted">
                {new Date(e.startDateTime).toLocaleDateString("de-CH")}
                {e.locationName ? ` · ${e.locationName}` : ""}
              </p>
              <div className="flex flex-col gap-1.5 pl-3">
                {e.shiftSlots.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant={s.area === "FUNKTIONAER" ? "funktionaer" : "helfer"}>
                        {s.area === "FUNKTIONAER" ? "Funktionär" : "Helfer"}
                      </Badge>
                      <span className="text-text">{s.activityName}</span>
                      {s.ageGroupRestrictions.length > 0 && (
                        <span className="text-xs text-muted">
                          Nur {s.ageGroupRestrictions.join(", ")}
                        </span>
                      )}
                      <span className="text-xs text-muted">{s.creditHours} Std.</span>
                    </span>
                    <span className="text-muted">
                      {s.signups.length > 0
                        ? s.signups
                            .map((sg) => `${sg.helperFirstName} ${sg.helperLastName}`)
                            .join(", ")
                        : `offen (0/${s.capacity})`}
                    </span>
                  </div>
                ))}
                {e.shiftSlots.length === 0 && (
                  <p className="text-sm text-muted">Keine Einsätze für dieses Event.</p>
                )}
              </div>
            </div>
          ))}
          {realEvents.length === 0 && (
            <p className="text-sm text-muted">Keine Helfereinsätze in dieser Saison.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
