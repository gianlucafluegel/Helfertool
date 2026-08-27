import type { ShiftArea, UserRole } from "@/generated/prisma/enums";

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
