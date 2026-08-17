import { prisma } from "@/lib/prisma";

export async function getMemberAgeGroupId(memberId: string, seasonId: string) {
  const membership = await prisma.seasonMembership.findUnique({
    where: { memberId_seasonId: { memberId, seasonId } },
  });
  return membership?.ageGroupId ?? null;
}
