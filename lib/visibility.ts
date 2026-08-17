import type { ShiftArea, UserRole } from "@/generated/prisma/enums";

type VisibilityShiftSlot = {
  area: ShiftArea;
  ageGroupRestrictions: { ageGroupId: string }[];
};

/**
 * Whether a ShiftSlot should be shown to / takeable by a given viewer.
 * GESCHAEFTSSTELLE/STUFENLEITER see everything (their own areas use this too,
 * scoped separately by age-group assignment where relevant).
 */
export function isShiftSlotVisible(
  slot: VisibilityShiftSlot,
  role: UserRole,
  activeMemberAgeGroupId: string | null,
): boolean {
  if (role === "GESCHAEFTSSTELLE" || role === "STUFENLEITER") return true;

  if (slot.area === "FUNKTIONAER" && role !== "FUNKTIONAER") return false;
  if (slot.area === "HELFER" && role !== "MITGLIED" && role !== "FUNKTIONAER") return false;

  if (slot.ageGroupRestrictions.length > 0) {
    if (!activeMemberAgeGroupId) return false;
    return slot.ageGroupRestrictions.some((r) => r.ageGroupId === activeMemberAgeGroupId);
  }

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
