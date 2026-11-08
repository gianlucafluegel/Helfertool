import { prisma } from "@/lib/prisma";
import type { MemberCategory, UserRole } from "@/generated/prisma/enums";

/**
 * Welche Kategorie(n) von Spielen (Nachwuchs/Aktiv) jemand sehen darf —
 * null bedeutet keine Einschränkung. Mitglieder richten sich nach ihrer
 * eigenen Kategorie, Stufenadmins nach den Stufen, die sie betreuen.
 * Geschäftsstelle und Funktionäre sehen alles.
 */
export async function getViewerCategories(user: {
  id: string;
  role: UserRole;
  member: { id: string } | null;
}): Promise<MemberCategory[] | null> {
  if (user.role === "MITGLIED" && user.member) {
    const member = await prisma.member.findUnique({
      where: { id: user.member.id },
      select: { category: true },
    });
    return member?.category ? [member.category] : null;
  }

  if (user.role === "STUFENLEITER") {
    const assignments = await prisma.stufenleiterAssignment.findMany({
      where: { userId: user.id },
      select: { ageGroup: { select: { category: true } } },
    });
    const categories = [...new Set(assignments.map((a) => a.ageGroup.category))];
    return categories.length > 0 ? categories : null;
  }

  return null;
}
