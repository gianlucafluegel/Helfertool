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
 * info (title/date/location/status) only when it has at least
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

type RoleInput = {
  activityName: string;
  capacity: number;
  description: string;
  requirements: string | null;
  memberId: string | null;
  startDateTime: Date;
  endDateTime: Date;
  creditHours: number;
};

/**
 * Liest die Rollen aus dem RolesFieldset — jede Zeile teilt sich ein `name`
 * (z.B. "roleActivityName"), die Reihenfolge über formData.getAll() entspricht
 * der Zeilen-Reihenfolge im Formular. Anforderungen gibt es nur bei externen
 * Events (RolesFieldset blendet das Feld für Spiele aus) und bleibt deshalb
 * optional, anders als der Beschrieb. Datum/Start/Ende/Anzahl Helferstunden
 * sind für jede Rolle einzeln erfasst — verschiedene Rollen desselben
 * Einsatzes können zu völlig unterschiedlichen Zeiten stattfinden.
 */
function parseRoleInputs(formData: FormData): RoleInput[] | string {
  const activityNames = formData.getAll("roleActivityName").map((v) => String(v).trim());
  const capacities = formData.getAll("roleCapacity").map(String);
  const descriptions = formData.getAll("roleDescription").map((v) => String(v).trim());
  const requirements = formData.getAll("roleRequirements").map((v) => String(v).trim());
  const memberIds = formData.getAll("roleMemberId").map(String);
  const dates = formData.getAll("roleDate").map(String);
  const startTimes = formData.getAll("roleStartTime").map(String);
  const endTimes = formData.getAll("roleEndTime").map(String);
  const creditHoursRaw = formData.getAll("roleCreditHours").map(String);

  if (activityNames.length === 0) {
    return "Mindestens eine Rolle ist erforderlich.";
  }
  if (activityNames.some((name) => !name)) {
    return "Bitte für jede Rolle eine Tätigkeit angeben.";
  }
  if (descriptions.some((d) => !d)) {
    return "Bitte für jede Rolle einen Beschrieb angeben.";
  }
  if (dates.some((d) => !d) || startTimes.some((t) => !t) || endTimes.some((t) => !t)) {
    return "Bitte für jede Rolle Datum, Start und Ende angeben.";
  }

  const roles: RoleInput[] = [];
  for (let i = 0; i < activityNames.length; i++) {
    const creditHours = Number(creditHoursRaw[i]);
    if (!Number.isFinite(creditHours) || creditHours <= 0) {
      return `Rolle ${i + 1}: Anzahl Helferstunden ist ein Pflichtfeld.`;
    }
    const startDateTime = combineDateTime(dates[i], startTimes[i]);
    const endDateTime = combineDateTime(dates[i], endTimes[i]);
    if (endDateTime <= startDateTime) {
      return `Rolle ${i + 1}: Ende muss nach Start liegen.`;
    }
    const capacity = Number(capacities[i]);
    roles.push({
      activityName: activityNames[i],
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 1,
      description: descriptions[i],
      requirements: requirements[i] || null,
      memberId: memberIds[i]?.trim() || null,
      startDateTime,
      endDateTime,
      creditHours,
    });
  }
  return roles;
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
  roles: RoleInput[],
  ageGroupId?: string | null,
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
        creditHours: role.creditHours,
        description: role.description,
        requirements: role.requirements,
        startDateTime: role.startDateTime,
        endDateTime: role.endDateTime,
        ...(ageGroupId
          ? { ageGroupRestrictions: { create: { ageGroupId } } }
          : {}),
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
  const ageGroupId = String(formData.get("ageGroupId") ?? "").trim() || null;

  if (!title || !locationId) {
    return "Titel und Standort sind Pflichtfelder.";
  }

  const roles = parseRoleInputs(formData);
  if (typeof roles === "string") return roles;

  const season = await getCurrentSeason();
  if (!season) return "Keine aktive Saison konfiguriert.";

  const event = await prisma.event.create({
    data: {
      seasonId: season.id,
      type: "GAME",
      title,
      locationId,
    },
  });

  const rolesError = await createShiftSlotsForEvent(event.id, roles, ageGroupId);
  if (rolesError) return rolesError;

  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  revalidatePath("/geschaeftsstelle");
  redirect("/geschaeftsstelle");
}

export async function createExternalEvent(prevState: string | undefined, formData: FormData) {
  await requireGeschaeftsstelle();

  const title = String(formData.get("title") ?? "").trim();
  const locationText = String(formData.get("locationText") ?? "").trim();

  if (!title || !locationText) {
    return "Titel und Ort sind Pflichtfelder.";
  }

  const roles = parseRoleInputs(formData);
  if (typeof roles === "string") return roles;

  const season = await getCurrentSeason();
  if (!season) return "Keine aktive Saison konfiguriert.";

  const event = await prisma.event.create({
    data: {
      seasonId: season.id,
      type: "EXTERNAL",
      title,
      locationText,
    },
  });

  const rolesError = await createShiftSlotsForEvent(event.id, roles);
  if (rolesError) return rolesError;

  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  revalidatePath("/geschaeftsstelle");
  redirect("/geschaeftsstelle");
}

export async function updateEvent(eventId: string, formData: FormData) {
  const session = await assertCanEditEvent(eventId);

  const title = String(formData.get("title") ?? "").trim();
  // GAME sendet locationId (Dropdown), EXTERNAL sendet locationText
  // (Freitext) — je nach Typ des Events fehlt das jeweils andere Feld im
  // FormData und wird hier korrekt zu null.
  const locationId = String(formData.get("locationId") ?? "") || null;
  const locationText = String(formData.get("locationText") ?? "").trim() || null;
  // Kein Status-Feld mehr im Formular — bleibt beim Speichern unverändert,
  // statt bei jeder Bearbeitung stillschweigend auf "Geplant" zurückgesetzt
  // zu werden.
  const statusRaw = formData.get("status");
  const status = statusRaw
    ? (String(statusRaw) as "SCHEDULED" | "CANCELLED" | "POSTPONED")
    : undefined;

  if (!title) {
    return;
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      locationId,
      locationText,
      status,
    },
  });

  // Die Stufe ist wie beim Erstellen nur ein Filter/Label, keine
  // Zugriffsbeschränkung — gilt einheitlich für alle Rollen des Einsatzes.
  // Nur Geschäftsstelle darf sie ändern (das Formularfeld selbst wird
  // Stufenleitern gar nicht angezeigt, hier zusätzlich serverseitig
  // durchgesetzt) und nur, wenn das Feld überhaupt gesendet wurde (bei
  // externen Events gibt es es nicht).
  if (session.user.role === "GESCHAEFTSSTELLE" && formData.has("ageGroupId")) {
    const ageGroupId = String(formData.get("ageGroupId") ?? "").trim() || null;
    const slots = await prisma.shiftSlot.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true },
    });
    await prisma.shiftSlotAgeGroup.deleteMany({
      where: { shiftSlotId: { in: slots.map((s) => s.id) } },
    });
    if (ageGroupId) {
      await prisma.shiftSlotAgeGroup.createMany({
        data: slots.map((s) => ({ shiftSlotId: s.id, ageGroupId })),
      });
    }
  }

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
  const description = String(formData.get("description") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim() || null;
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const creditHours = Number(formData.get("creditHours"));

  if (
    !activityName ||
    !description ||
    !date ||
    !startTime ||
    !endTime ||
    !Number.isFinite(creditHours) ||
    creditHours <= 0
  ) {
    return "Tätigkeit, Beschrieb, Datum, Start, Ende und Anzahl Helferstunden sind Pflichtfelder.";
  }
  const startDateTime = combineDateTime(date, startTime);
  const endDateTime = combineDateTime(date, endTime);
  if (endDateTime <= startDateTime) {
    return "Ende muss nach Start liegen.";
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

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) {
    return "Helfereinsatz nicht gefunden.";
  }

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
      description,
      requirements,
      startDateTime,
      endDateTime,
      ageGroupRestrictions: {
        create: existingRestrictions.map((r) => ({ ageGroupId: r.ageGroupId })),
      },
    },
  });

  revalidatePath(`/geschaeftsstelle/helfereinsaetze/${eventId}`);
}

/**
 * Erlaubt einer bestehenden Rolle nachträglich Datum/Start/Ende/Anzahl
 * Helferstunden zu korrigieren (z.B. bei einer Spielverschiebung) — die
 * einzige Bearbeitungsmöglichkeit für diese Felder, da sie nur noch beim
 * Erstellen einer Rolle erfasst werden. Slot-scoped statt eventId-scoped
 * wie assertCanEditEvent, gleiche Stufenleiter-Logik wie bei
 * assignMemberToShiftSlot.
 */
async function assertCanEditShiftSlot(shiftSlotId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Keine Berechtigung.");

  const shiftSlot = await prisma.shiftSlot.findUnique({
    where: { id: shiftSlotId },
    include: { ageGroupRestrictions: true },
  });
  if (!shiftSlot || shiftSlot.deletedAt) throw new Error("Rolle nicht gefunden.");

  if (session.user.role === "GESCHAEFTSSTELLE") return { session, shiftSlot };

  if (session.user.role === "STUFENLEITER") {
    const assignments = await prisma.stufenleiterAssignment.findMany({
      where: { userId: session.user.id },
      select: { ageGroupId: true },
    });
    const allowed = new Set(assignments.map((a) => a.ageGroupId));
    if (
      canManageShiftSlot(
        "STUFENLEITER",
        shiftSlot.ageGroupRestrictions.map((r) => r.ageGroupId),
        allowed,
      )
    ) {
      return { session, shiftSlot };
    }
  }

  throw new Error("Keine Berechtigung.");
}

export async function updateShiftSlot(
  shiftSlotId: string,
  formData: FormData,
): Promise<string | undefined> {
  const { shiftSlot } = await assertCanEditShiftSlot(shiftSlotId);

  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const creditHours = Number(formData.get("creditHours"));

  if (!date || !startTime || !endTime || !Number.isFinite(creditHours) || creditHours <= 0) {
    return "Datum, Start, Ende und Anzahl Helferstunden sind Pflichtfelder.";
  }

  const startDateTime = combineDateTime(date, startTime);
  const endDateTime = combineDateTime(date, endTime);
  if (endDateTime <= startDateTime) {
    return "Ende muss nach Start liegen.";
  }

  await prisma.shiftSlot.update({
    where: { id: shiftSlotId },
    data: { startDateTime, endDateTime, creditHours },
  });

  revalidatePath(`/geschaeftsstelle/helfereinsaetze/${shiftSlot.eventId}`);
  revalidatePath("/geschaeftsstelle/helfereinsaetze");
  revalidatePath("/geschaeftsstelle");
  revalidatePath("/stufenleiter", "layout");
  revalidatePath("/einsaetze");
  return undefined;
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
