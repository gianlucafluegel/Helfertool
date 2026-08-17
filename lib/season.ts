import { prisma } from "@/lib/prisma";

export async function getCurrentSeason() {
  return prisma.season.findFirst({
    where: { isArchived: false },
    orderBy: { startDate: "desc" },
  });
}
