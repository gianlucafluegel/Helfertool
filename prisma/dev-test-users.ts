import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const season = await prisma.season.findFirstOrThrow({ where: { isArchived: false } });
  const u14 = await prisma.ageGroup.findFirstOrThrow({ where: { name: "U14" } });
  const u9 = await prisma.ageGroup.findFirstOrThrow({ where: { name: "U9" } });
  const passwordHash = await bcrypt.hash("TestPass123!", 12);

  // Mitglied (parent-style login) with two children
  const lara = await prisma.member.upsert({
    where: { externalContactId: "TEST-LARA" },
    update: {},
    create: {
      firstName: "Lara",
      lastName: "Muster",
      email: "lara.parent@example.test",
      externalContactId: "TEST-LARA",
      seasonMemberships: {
        create: { seasonId: season.id, ageGroupId: u14.id, targetHours: 20 },
      },
    },
  });
  const timo = await prisma.member.upsert({
    where: { externalContactId: "TEST-TIMO" },
    update: {},
    create: {
      firstName: "Timo",
      lastName: "Muster",
      email: "timo.parent@example.test",
      externalContactId: "TEST-TIMO",
      seasonMemberships: {
        create: { seasonId: season.id, ageGroupId: u9.id, targetHours: 15 },
      },
    },
  });

  const parentUser = await prisma.user.upsert({
    where: { email: "eltern@example.test" },
    update: { passwordHash, role: "MITGLIED", isActive: true },
    create: { email: "eltern@example.test", passwordHash, role: "MITGLIED" },
  });
  await prisma.userMemberLink.upsert({
    where: { userId_memberId: { userId: parentUser.id, memberId: lara.id } },
    update: { isPrimary: true },
    create: { userId: parentUser.id, memberId: lara.id, isPrimary: true },
  });
  await prisma.userMemberLink.upsert({
    where: { userId_memberId: { userId: parentUser.id, memberId: timo.id } },
    update: {},
    create: { userId: parentUser.id, memberId: timo.id },
  });

  // Funktionär
  const funkMember = await prisma.member.upsert({
    where: { externalContactId: "TEST-FUNK" },
    update: {},
    create: { firstName: "Nora", lastName: "Beispiel", email: "funktionaer@example.test", externalContactId: "TEST-FUNK" },
  });
  const funkUser = await prisma.user.upsert({
    where: { email: "funktionaer@example.test" },
    update: { passwordHash, role: "FUNKTIONAER", isActive: true },
    create: { email: "funktionaer@example.test", passwordHash, role: "FUNKTIONAER" },
  });
  await prisma.userMemberLink.upsert({
    where: { userId_memberId: { userId: funkUser.id, memberId: funkMember.id } },
    update: { isPrimary: true },
    create: { userId: funkUser.id, memberId: funkMember.id, isPrimary: true },
  });

  // Stufenleiter for U14
  const slMember = await prisma.member.upsert({
    where: { externalContactId: "TEST-SL" },
    update: {},
    create: { firstName: "Peter", lastName: "Stufenchef", email: "stufenleiter@example.test", externalContactId: "TEST-SL" },
  });
  const slUser = await prisma.user.upsert({
    where: { email: "stufenleiter@example.test" },
    update: { passwordHash, role: "STUFENLEITER", isActive: true },
    create: { email: "stufenleiter@example.test", passwordHash, role: "STUFENLEITER" },
  });
  await prisma.userMemberLink.upsert({
    where: { userId_memberId: { userId: slUser.id, memberId: slMember.id } },
    update: { isPrimary: true },
    create: { userId: slUser.id, memberId: slMember.id, isPrimary: true },
  });
  await prisma.stufenleiterAssignment.upsert({
    where: { userId_ageGroupId: { userId: slUser.id, ageGroupId: u14.id } },
    update: {},
    create: { userId: slUser.id, ageGroupId: u14.id },
  });

  console.log("Test users ready (password: TestPass123!):");
  console.log("- Mitglied (Eltern, Lara U14 + Timo U9): eltern@example.test");
  console.log("- Funktionär: funktionaer@example.test");
  console.log("- Stufenleiter (U14): stufenleiter@example.test");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
