"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { canManageShiftSlot } from "@/lib/visibility";

async function requireGeschaeftsstelle() {
  const session = await auth();
  if (session?.user.role !== "GESCHAEFTSSTELLE") {
    throw new Error("Keine Berechtigung.");
  }
  return session;
}

/**
 * Geschäftsstelle can edit any event. Stufenleiter can correct an event's
 * info (title/description/date/location/status) only when it has at least
 * one ShiftSlot restricted to one of their assigned Stufen — they still
 * can't create, delete, or add/remove ShiftSlots (see the other actions
 * below, which stay Geschäftsstelle-only).
 */
async function assertCanEditEvent(eventId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Keine Berechtigung.");
  if (session.user.role === "GESCHAEFTSSTELLE") return session;

  if (session.user.role === "STUFENLEITER") {
    const [assignments, shiftSlots] = await Promise.all([
      prisma.stufenleiterAssignment.findMany({
        where: { userId: session.user.id },
        select: { ageGroupId: true },
      }),
      prisma.shiftSlot.findMany({
        where: { eventId, deletedAt: null },
        include: { ageGroupRestrictions: true },
      }),
    ]);
    const allowed = new Set(assignments.map((a) => a.ageGroupId));
    const canEdit = shiftSlots.some((slot) =>
      canManageShiftSlot(
        "STUFENLEITER",
        slot.ageGroupRestrictions.map((r) => r.ageGroupId),
        allowed,
      ),
    );
    if (canEdit) return session;
  }

  throw new Error("Keine Berechtigung.");
}

/** Combines separate Datum/Start(/Ende)-Feldern into one Date. */
function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

/** Anzahl Helferstunden wird immer aus Start/Ende berechnet, nie manuell erfasst. */
function hoursBetween(start: Date, end: Date): number {
  return Math.round(((end.getTime() - start.getTime()) / (60 * 60 * 1000)) * 100) / 100;
}

type RoleInput = { activityName: string; capacity: number; notes: string | null; memberId: string | null };

/**
 * Liest die Rollen aus dem RolesFieldset — jede Zeile teilt sich ein `name`
 * (z.B. "roleActivityName"), die Reihenfolge über formData.getAll() entspricht
 * der Zeilen-Reihenfolge im Formular.
 */
function parseRoleInputs(formData: FormData): RoleInput[] | string {
  const activityNames = formData.getAll("roleActivityName").map((v) => String(v).trim());
  const capacities = formData.getAll("roleCapacity").map(String);
  const notesList = formData.getAll("roleNotes").map(String);
  const memberIds = formData.getAll("roleMemberId").map(String);

  if (activityNames.length === 0) {
    return "Mindestens eine Rolle ist erforderlich.";
  }
  if (activityNames.some((name) => !name)) {
    return "Bitte für jede Rolle eine Tätigkeit angeben.";
  }

  return activityNames.map((activityName, i) => {
    const capacity = Number(capacities[i]);
    return {
      activityName,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 1,
      notes: notesList[i]?.trim() || null,
      memberId: memberIds[i]?.trim() || null,
    };
  });
}

/**
 * Legt für jede Rolle eine ShiftSlot an, optional direkt mit zugeordnetem
 * Helfer. Die Tätigkeit ist ein Freitextfeld statt einer festen Auswahl —
 * beim Speichern wird per Namen eine bestehende Activity wiederverwendet
 * oder neu angelegt. Keine Tätigkeit ist exklusiv für Funktionäre, jede so
 * erstellte Rolle ist deshalb immer Bereich "Helfer".
 */
async function createShiftSlotsForEvent(
  eventId: string,
  creditHours: number,
  roles: RoleInput[],
): Promise<string | undefined> {
  for (const role of roles) {
    const activity = await prisma.activity.upsert({
      where: { name: role.activityName },
      update: {},
      create: { name: role.activityName },
    });

    const member = role.memberId
      ? await prisma.member.findUnique({ where: { id: role.memberId } })
      : null;

    await prisma.shiftSlot.create({
      data: {
        eventId,
        activityId: activity.id,
        area: "HELFER",
        capacity: role.capacity,
        creditHours,
        notes: role.notes,
        ...(member
          ? {
              signups: {
                create: {
                  memberId: member.id,
                  ageGroupSnapshot: "Alle Teams",
                  helperFirstName: member.firstName,
                  helperLastName: member.lastName,
                  helperEmail: member.email ?? "",
                  helperPhone: member.phone,
                  payoutType: "HELFERKONTINGENT",
                },
              },
            }
          : {}),
      },
    });
  }
  return undefined;
}

export async function createGameEvent(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();

  const title = String(formData.get("title") ?? "").trim();
  const locationId = String(formData.get("locationId") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const creditHours = Number(formData.get("creditHours"));

  if (
    !title ||
    !locationId ||
    !description ||
    !date ||
    !startTime ||
    !endTime ||
    !Number.isFinite(creditHours) ||
    creditHours <= 0
  ) {
    return "Titel, Standort, Einsatzbeschrieb, Datum, Start, Ende und Anzahl Helferstunden sind Pflichtfelder.";
  }

  const roles = parseRoleInputs(formData);
  if (typeof roles === "string") return roles;

  const season = await getCurrentSeason();
  if (!season) return "Keine aktive Saison konfiguriert.";

  const startDateTime = combineDateTime(date, startTime);
  const endDateTime = combineDateTime(date, endTime);
  if (endDateTime <= startDateTime) {
    return "Ende muss nach Start liegen.";
  }

  const event = await prisma.event.create({
    data: {
      seasonId: season.id,
      type: "GAME",
      title,
      description,
      locationId,
      startDateTime,
      endDateTime,
    },
  });

  const rolesError = await createShiftSlotsForEvent(event.id, creditHours, roles);
  if (rolesError) return rolesError;

  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  redirect(`/geschaeftsstelle/helfereinsaetze/${event.id}`);
}

export async function createExternalEvent(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();

  const title = String(formData.get("title") ?? "").trim();
  const locationText = String(formData.get("locationText") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const creditHours = Number(formData.get("creditHours"));

  if (
    !title ||
    !locationText ||
    !description ||
    !requirements ||
    !date ||
    !startTime ||
    !endTime ||
    !Number.isFinite(creditHours) ||
    creditHours <= 0
  ) {
    return "Titel, Ort, Einsatzbeschrieb, Anforderungen, Datum, Start, Ende und Anzahl Helferstunden sind Pflichtfelder.";
  }

  const roles = parseRoleInputs(formData);
  if (typeof roles === "string") return roles;

  const season = await getCurrentSeason();
  if (!season) return "Keine aktive Saison konfiguriert.";

  const startDateTime = combineDateTime(date, startTime);
  const endDateTime = combineDateTime(date, endTime);
  if (endDateTime <= startDateTime) {
    return "Ende muss nach Start liegen.";
  }

  const event = await prisma.event.create({
    data: {
      seasonId: season.id,
      type: "EXTERNAL",
      title,
      description,
      locationText,
      requirements,
      startDateTime,
      endDateTime,
    },
  });

  const rolesError = await createShiftSlotsForEvent(event.id, creditHours, roles);
  if (rolesError) return rolesError;

  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  redirect(`/geschaeftsstelle/helfereinsaetze/${event.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  await assertCanEditEvent(eventId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  // GAME sendet locationId (Dropdown), EXTERNAL sendet locationText/
  // requirements (Freitext) — je nach Typ des Events fehlt das jeweils
  // andere Set im FormData und wird hier korrekt zu null.
  const locationId = String(formData.get("locationId") ?? "") || null;
  const locationText = String(formData.get("locationText") ?? "").trim() || null;
  const requirements = String(formData.get("requirements") ?? "").trim() || null;
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const creditHours = Number(formData.get("creditHours"));
  const status = String(formData.get("status") ?? "SCHEDULED") as
    | "SCHEDULED"
    | "CANCELLED"
    | "POSTPONED";

  if (!title || !description || !Number.isFinite(creditHours) || creditHours <= 0) {
    return;
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      description,
      locationId,
      locationText,
      requirements,
      startDateTime: date && startTime ? combineDateTime(date, startTime) : undefined,
      endDateTime: date && endTime ? combineDateTime(date, endTime) : null,
      status,
    },
  });

  // Die Anzahl Helferstunden gilt einheitlich für alle Rollen dieses
  // Einsatzes — hier wird sie für alle (nicht gelöschten) Rollen zusammen
  // aktualisiert, statt pro Rolle einzeln erfasst zu werden.
  await prisma.shiftSlot.updateMany({
    where: { eventId, deletedAt: null },
    data: { creditHours },
  });

  revalidatePath(`/geschaeftsstelle/helfereinsaetze/${eventId}`);
  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  revalidatePath("/stufenleiter", "layout");
}

export async function deleteEvent(eventId: string) {
  await requireGeschaeftsstelle();
  await prisma.event.update({ where: { id: eventId }, data: { deletedAt: new Date() } });
  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  redirect("/geschaeftsstelle/helfereinsaetze");
}

export async function addShiftSlot(eventId: string, formData: FormData) {
  await requireGeschaeftsstelle();

  const activityName = String(formData.get("activityName") ?? "").trim();
  const capacity = Number(formData.get("capacity") ?? 1);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!activityName) {
    return "Tätigkeit ist ein Pflichtfeld.";
  }

  // Tätigkeit ist ein Freitextfeld statt einer festen Auswahl — beim
  // Speichern wird per Namen eine bestehende Activity wiederverwendet oder
  // neu angelegt. Keine Tätigkeit ist exklusiv für Funktionäre, der Bereich
  // ist deshalb immer "Helfer".
  const activity = await prisma.activity.upsert({
    where: { name: activityName },
    update: {},
    create: { name: activityName },
  });
  const area = "HELFER" as const;

  // Anzahl Helferstunden ist ebenfalls keine eigene Eingabe mehr — sie
  // ergibt sich aus Start/Ende des Einsatzes, den diese Rolle ergänzt.
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { startDateTime: true, endDateTime: true },
  });
  if (!event) {
    return "Helfereinsatz nicht gefunden.";
  }
  if (!event.endDateTime) {
    return "Für diesen Helfereinsatz ist kein Ende hinterlegt — bitte zuerst unter 'Helfereinsatz bearbeiten' ein Ende setzen.";
  }
  const creditHours = hoursBetween(event.startDateTime, event.endDateTime);

  // Eine neue Rolle übernimmt automatisch dieselbe Team-Einschränkung wie
  // die bereits bestehenden Rollen dieses Einsatzes (z.B. "Nur U14" aus dem
  // MySIHF-Import) — es gibt dafür keine eigene Eingabe mehr, eine Rolle
  // soll nicht versehentlich für andere Teams offen sein als der Rest des
  // Einsatzes.
  const existingRestrictions = await prisma.shiftSlotAgeGroup.findMany({
    where: { shiftSlot: { eventId, deletedAt: null } },
    select: { ageGroupId: true },
    distinct: ["ageGroupId"],
  });

  await prisma.shiftSlot.create({
    data: {
      eventId,
      activityId: activity.id,
      area,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 1,
      creditHours,
      notes,
      ageGroupRestrictions: {
        create: existingRestrictions.map((r) => ({ ageGroupId: r.ageGroupId })),
      },
    },
  });

  revalidatePath(`/geschaeftsstelle/helfereinsaetze/${eventId}`);
}

export async function deleteShiftSlot(eventId: string, shiftSlotId: string) {
  await requireGeschaeftsstelle();
  await prisma.shiftSlot.update({ where: { id: shiftSlotId }, data: { deletedAt: new Date() } });
  revalidatePath(`/geschaeftsstelle/helfereinsaetze/${eventId}`);
}

/**
 * Direkte Zuordnung durch Geschäftsstelle oder Stufenleiter — für eine
 * bereits bestehende Rolle, nicht nur beim Erstellen. Legt den Signup
 * direkt aus den Mitgliedsdaten an (wie beim Helfer-Feld in den
 * Erfassungsformularen), ohne den öffentlichen Anmelde-Flow. Ein
 * Stufenleiter darf das nur für Rollen, die einer seiner zugewiesenen
 * Stufen zugeordnet sind — welches Mitglied zugeordnet wird, ist dabei
 * nicht eingeschränkt (Mitglieder jedes Teams können jeden Einsatz
 * leisten, nur welche Rolle bearbeitet werden darf, ist gescopet).
 */
export async function assignMemberToShiftSlot(
  shiftSlotId: string,
  memberId: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Bitte melde dich an." };
  if (session.user.role !== "GESCHAEFTSSTELLE" && session.user.role !== "STUFENLEITER") {
    return { error: "Keine Berechtigung." };
  }

  const [shiftSlot, member] = await Promise.all([
    prisma.shiftSlot.findUnique({
      where: { id: shiftSlotId },
      include: {
        ageGroupRestrictions: { include: { ageGroup: true } },
        signups: { where: { status: "CONFIRMED" } },
      },
    }),
    prisma.member.findUnique({ where: { id: memberId } }),
  ]);

  if (!shiftSlot || shiftSlot.deletedAt) return { error: "Rolle nicht gefunden." };
  if (!member) return { error: "Mitglied nicht gefunden." };

  if (session.user.role === "STUFENLEITER") {
    const assignments = await prisma.stufenleiterAssignment.findMany({
      where: { userId: session.user.id },
      select: { ageGroupId: true },
    });
    const allowed = new Set(assignments.map((a) => a.ageGroupId));
    const canManage = canManageShiftSlot(
      "STUFENLEITER",
      shiftSlot.ageGroupRestrictions.map((r) => r.ageGroupId),
      allowed,
    );
    if (!canManage) return { error: "Keine Berechtigung." };
  }
  if (shiftSlot.signups.length >= shiftSlot.capacity) {
    return { error: "Diese Rolle ist bereits vollständig besetzt." };
  }
  if (shiftSlot.signups.some((s) => s.memberId === memberId)) {
    return { error: "Dieses Mitglied ist für diese Rolle bereits eingetragen." };
  }

  const ageGroupSnapshot = shiftSlot.ageGroupRestrictions[0]?.ageGroup.name ?? "Alle Teams";

  await prisma.signup.create({
    data: {
      shiftSlotId,
      memberId: member.id,
      ageGroupSnapshot,
      helperFirstName: member.firstName,
      helperLastName: member.lastName,
      helperEmail: member.email ?? "",
      helperPhone: member.phone,
      payoutType: "HELFERKONTINGENT",
    },
  });

  revalidatePath(`/geschaeftsstelle/helfereinsaetze/${shiftSlot.eventId}`);
  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  revalidatePath("/geschaeftsstelle");
  revalidatePath("/einsaetze");
  revalidatePath("/mein-konto");
  revalidatePath("/stufenleiter", "layout");
  return {};
}
