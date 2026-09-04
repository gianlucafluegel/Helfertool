import type { SignupPayoutType } from "@/generated/prisma/enums";

const CANCELLATION_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;

export function canCancelSignup(shiftStart: Date, now: Date = new Date()): boolean {
  return shiftStart.getTime() - now.getTime() >= CANCELLATION_WINDOW_MS;
}

export function shiftRequiresPayoutChoice(
  activityRequiresPayoutChoice: boolean,
  ageGroupRestrictions: { ageGroup: { triggersBarbezugChoice: boolean } }[],
): boolean {
  return (
    activityRequiresPayoutChoice &&
    ageGroupRestrictions.some((r) => r.ageGroup.triggersBarbezugChoice)
  );
}

/**
 * Sonderfall Truckerfestival: Helfer:innen für Einsätze, deren Titel
 * "Trucker" enthält (z.B. "Truckerfestival", "Trucker Festival"), müssen
 * beim Anmelden zusätzlich angeben, wo sie ihr Armband abholen möchten.
 * Reiner Titel-Substring-Match — bewusst kein generisches
 * "Zusatzfrage pro Event"-System, da dies der einzige bekannte Fall ist.
 */
export function requiresWristbandPickupChoice(eventTitle: string): boolean {
  return /trucker/i.test(eventTitle);
}

export function validatePayoutChoice(input: {
  activityRequiresPayoutChoice: boolean;
  ageGroupTriggersBarbezug: boolean;
  payoutType: SignupPayoutType;
  iban?: string | null;
}): { ok: true } | { ok: false; error: string } {
  const isSpecialCase =
    input.activityRequiresPayoutChoice && input.ageGroupTriggersBarbezug;

  if (isSpecialCase && input.payoutType === "BARBEZUG" && !input.iban) {
    return { ok: false, error: "IBAN erforderlich für Barbezug." };
  }

  return { ok: true };
}
