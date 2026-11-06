const CANCELLATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function canCancelSignup(shiftStart: Date, now: Date = new Date()): boolean {
  return shiftStart.getTime() - now.getTime() >= CANCELLATION_WINDOW_MS;
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
