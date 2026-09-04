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
 * Snapshots the current season's Helfereinsätze (Events/ShiftSlots/Signups)
 * plus each Member's stats at that moment into a self-contained JSON
 * archive, then wipes only that season-specific activity and opens a new
 * season. Members and their logins are deliberately NOT touched — a person
 * stays a member (and can still log in) across seasons; their Stufe/E-Mail
 * gets refreshed by the yearly roster re-import instead, and Soll-Stunden
 * resets to 0 pending that import. Only the archived Events/ShiftSlots/
 * Signups are irreversible; no code path ever writes an archive back.
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
      category: m.category,
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
      locationName: e.location?.name ?? e.locationText ?? null,
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

    // Only the season-specific activity gets wiped (FK-safe order); Members,
    // their logins, and StufenleiterAssignments carry over untouched.
    await tx.signup.deleteMany({});
    await tx.shiftSlotAgeGroup.deleteMany({});
    await tx.shiftSlot.deleteMany({});
    await tx.event.deleteMany({ where: { seasonId: season.id } });

    // Soll-Stunden is season-specific — reset it for everyone, the next
    // roster import will set the new season's real value.
    await tx.member.updateMany({ data: { targetHours: 0 } });

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
