import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import { ArchivedMembersTable } from "./ArchivedMembersTable";
import { ArchivedEventsList } from "./ArchivedEventsList";

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
  startDateTime: string;
  endDateTime: string;
  ageGroupRestrictions: string[];
  signups: ArchivedSignup[];
};

type ArchivedEvent = {
  id: string;
  title: string;
  locationName: string | null;
  date: string;
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
          Archiviert am {formatDate(new Date(data.archivedAt))} · {data.members.length}{" "}
          Mitglieder · {realEvents.length} Helfereinsätze — nur lesbar.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Mitglieder & Helferstunden
        </h2>
        <ArchivedMembersTable members={data.members} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Helfereinsätze
        </h2>
        <ArchivedEventsList events={realEvents} />
      </Card>
    </div>
  );
}
