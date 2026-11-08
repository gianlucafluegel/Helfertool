import type { EventType, MemberCategory, ShiftArea, UserRole } from "@/generated/prisma/enums";

type VisibilityShiftSlot = {
  area: ShiftArea;
};

/**
 * Whether a ShiftSlot should be shown to / takeable by a given viewer.
 * GESCHAEFTSSTELLE/STUFENLEITER see everything. A slot's "Stufe" restriction
 * (ageGroupRestrictions) is purely a filter/label on the Einsätze list — it
 * does not gate visibility, because Members don't carry a Stufe of their own
 * to compare against (only a Helfereinsatz has one). Every Mitglied/
 * Funktionär sees every Einsatz, subject only to the role/area check below.
 */
export function isShiftSlotVisible(slot: VisibilityShiftSlot, role: UserRole): boolean {
  if (role === "GESCHAEFTSSTELLE" || role === "STUFENLEITER") return true;

  if (slot.area === "FUNKTIONAER" && role !== "FUNKTIONAER") return false;
  if (slot.area === "HELFER" && role !== "MITGLIED" && role !== "FUNKTIONAER") return false;

  return true;
}

/**
 * Nachwuchs- und Aktiv-Mitglieder (und Stufenadmins der jeweiligen Kategorie)
 * sehen nur die Spiele ihrer Kategorie. Externe Events und Rollen ohne Stufe
 * sind für beide verfügbar. `viewerCategories === null` heisst: keine
 * Einschränkung (Geschäftsstelle, Funktionäre, Mitglieder ohne Kategorie).
 */
export function isSlotInViewerScope(
  slot: { ageGroupRestrictions: { ageGroup: { category: MemberCategory } }[] },
  eventType: EventType,
  viewerCategories: MemberCategory[] | null,
): boolean {
  if (!viewerCategories) return true;
  if (eventType === "EXTERNAL") return true;
  if (slot.ageGroupRestrictions.length === 0) return true;
  return slot.ageGroupRestrictions.some((r) => viewerCategories.includes(r.ageGroup.category));
}

/** Kategorien, in denen ein Spiel stattfindet (leer bei externen Events und Spielen ohne Stufe). */
export function getEventCategories(
  eventType: EventType,
  slots: { ageGroupRestrictions: { ageGroup: { category: MemberCategory } }[] }[],
): MemberCategory[] {
  if (eventType === "EXTERNAL") return [];
  return [...new Set(slots.flatMap((s) => s.ageGroupRestrictions.map((r) => r.ageGroup.category)))];
}

/** Bezeichnung für "alle Mitglieder, die diesen Einsatz sehen" (z.B. im Reminder). */
export function allMembersLabel(categories: MemberCategory[]): string {
  if (categories.length === 1) {
    return categories[0] === "NACHWUCHS" ? "Alle Nachwuchs-Mitglieder" : "Alle Aktiv-Mitglieder";
  }
  return "Alle Mitglieder";
}

/**
 * Whether the caller may administer (correct/cancel) signups on this shift slot.
 * GESCHAEFTSSTELLE can manage anything; STUFENLEITER only slots restricted to one
 * of their assigned age groups (an unrestricted slot is out of a Stufenleiter's scope).
 */
export function canManageShiftSlot(
  role: UserRole,
  slotAgeGroupIds: string[],
  stufenleiterAssignedAgeGroupIds: Set<string>,
): boolean {
  if (role === "GESCHAEFTSSTELLE") return true;
  if (role !== "STUFENLEITER") return false;
  return slotAgeGroupIds.some((id) => stufenleiterAssignedAgeGroupIds.has(id));
}
