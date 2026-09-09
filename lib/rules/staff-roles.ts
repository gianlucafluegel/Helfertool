import type { UserRole } from "@/generated/prisma/enums";

/**
 * Welche Login-Rollen bei "Login erstellen/aktualisieren & einladen" zur
 * Auswahl stehen, abhängig von der aktuellen Rolle des Mitglieds (oder
 * "MITGLIED", falls noch kein Login existiert) — ein normales Mitglied soll
 * nicht aus Versehen zum Funktionär gemacht werden können und umgekehrt. Nur
 * bei Stufenadmins gibt es bewusst eine echte Wahl, da die Beförderung zu
 * Geschäftsstelle ein realistischer Schritt ist. Server-seitig durchgesetzt,
 * nicht nur im UI versteckt.
 */
export const ALLOWED_INVITE_ROLES: Record<UserRole, UserRole[]> = {
  MITGLIED: ["MITGLIED"],
  FUNKTIONAER: ["FUNKTIONAER"],
  STUFENLEITER: ["STUFENLEITER", "GESCHAEFTSSTELLE"],
  GESCHAEFTSSTELLE: ["GESCHAEFTSSTELLE"],
};

export function isAllowedInviteRole(currentRole: UserRole | null, role: UserRole): boolean {
  return ALLOWED_INVITE_ROLES[currentRole ?? "MITGLIED"].includes(role);
}
