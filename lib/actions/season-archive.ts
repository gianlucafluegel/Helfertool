"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
  return session;
}

/**
 * Snapshots the entire current season (Mitglieder, Helfereinsätze inkl.
 * ShiftSlots/Signups) into a self-contained JSON archive, then wipes the
 * live tables and opens a new season — the "fresh start" the club wants at
 * the beginning of each season, while keeping old seasons browsable.
 *
 * Deliberately irreversible: no code path in this app ever writes back from
 * an archive into the live tables.
 */
export async function archiveSeason(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();

  const newLabel = String(formData.get("newSeasonLabel") ?? "").trim();
  const confirmLabel = String(formData.get("confirmLabel") ?? "").trim();

  const season = await getCurrentSeason();
  if (!season) return "Keine aktive Saison konfiguriert.";

  if (!newLabel) {
    return "Bezeichnung der neuen Saison ist ein Pflichtfeld.";
  }
  if (confirmLabel !== season.label) {
    return `Zur Bestätigung bitte exakt "${season.label}" eingeben.`;
  }

  // The new season picks up right where the old one's end date left off, for
  // the same duration — no date inputs needed for what's always the same
  // one-year cycle.
  const newStart = new Date(season.endDate);
  newStart.setDate(newStart.getDate() + 1);
  const newEnd = new Date(newStart);
  newEnd.setFullYear(newEnd.getFullYear() + 1);
  newEnd.setDate(newEnd.getDate() - 1);

  const [members, events] = await Promise.all([
    prisma.member.findMany({
      include: {
        ageGroup: true,
        signups: { include: { shiftSlot: { include: { event: true } } } },
      },
    }),
    prisma.event.findMany({
      where: { seasonId: season.id },
      include: {
        location: true,
        shiftSlots: {
          include: {
            activity: true,
            ageGroupRestrictions: { include: { ageGroup: true } },
            signups: true,
          },
        },
      },
    }),
  ]);

  const now = new Date();

  const data = {
    seasonLabel: season.label,
    seasonStart: season.startDate.toISOString(),
    seasonEnd: season.endDate.toISOString(),
    archivedAt: now.toISOString(),
    members: members.map((m) => ({
      id: m.id,
      externalContactId: m.externalContactId,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      ageGroupName: m.ageGroup?.name ?? null,
      targetHours: Number(m.targetHours),
      completedHours: m.signups
        .filter(
          (s) =>
            s.status === "CONFIRMED" &&
            s.payoutType === "HELFERKONTINGENT" &&
            s.shiftSlot.event.startDateTime < now,
        )
        .reduce((sum, s) => sum + Number(s.shiftSlot.creditHours), 0),
    })),
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description,
      locationName: e.location?.name ?? null,
      startDateTime: e.startDateTime.toISOString(),
      status: e.status,
      isManualEntry: e.isManualEntry,
      shiftSlots: e.shiftSlots.map((s) => ({
        id: s.id,
        activityName: s.activity.name,
        area: s.area,
        capacity: s.capacity,
        creditHours: Number(s.creditHours),
        notes: s.notes,
        ageGroupRestrictions: s.ageGroupRestrictions.map((r) => r.ageGroup.name),
        signups: s.signups.map((sg) => ({
          id: sg.id,
          helperFirstName: sg.helperFirstName,
          helperLastName: sg.helperLastName,
          helperEmail: sg.helperEmail,
          helperPhone: sg.helperPhone,
          payoutType: sg.payoutType,
          ibanSnapshot: sg.ibanSnapshot,
          status: sg.status,
          ageGroupSnapshot: sg.ageGroupSnapshot,
          createdAt: sg.createdAt.toISOString(),
        })),
      })),
    })),
  };

  await prisma.$transaction(async (tx) => {
    await tx.seasonArchive.create({
      data: { seasonId: season.id, seasonLabel: season.label, data },
    });

    // Wipe in FK-safe order. Members/ImportBatch have no seasonId (there's
    // only ever one live season), so they're cleared unconditionally;
    // Events are scoped to this season for extra safety.
    await tx.signup.deleteMany({});
    await tx.shiftSlotAgeGroup.deleteMany({});
    await tx.shiftSlot.deleteMany({});
    await tx.event.deleteMany({ where: { seasonId: season.id } });
    await tx.stufenleiterAssignment.deleteMany({});
    await tx.authToken.deleteMany({ where: { user: { memberId: { not: null } } } });
    await tx.user.deleteMany({ where: { memberId: { not: null } } });
    await tx.member.deleteMany({});
    await tx.importBatch.deleteMany({});

    await tx.season.update({
      where: { id: season.id },
      data: { isArchived: true, archivedAt: now },
    });
    await tx.season.create({
      data: { label: newLabel, startDate: newStart, endDate: newEnd },
    });
  });

  revalidatePath("/geschaeftsstelle", "layout");
  redirect("/geschaeftsstelle/datenbank");
}
