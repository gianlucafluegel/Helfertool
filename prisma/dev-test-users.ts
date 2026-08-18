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

  // Each child gets its own login — one login per Member, never shared.
  const lara = await prisma.member.upsert({
    where: { externalContactId: "TEST-LARA" },
    update: {},
    create: {
      firstName: "Lara",
      lastName: "Muster",
      email: "lara.muster@example.test",
      externalContactId: "TEST-LARA",
      seasonMemberships: {
        create: { seasonId: season.id, ageGroupId: u14.id, targetHours: 20 },
      },
    },
  });
  await prisma.user.upsert({
    where: { email: "lara.muster@example.test" },
    update: { passwordHash, role: "MITGLIED", isActive: true, memberId: lara.id },
    create: { email: "lara.muster@example.test", passwordHash, role: "MITGLIED", memberId: lara.id },
  });

  const timo = await prisma.member.upsert({
    where: { externalContactId: "TEST-TIMO" },
    update: {},
    create: {
      firstName: "Timo",
      lastName: "Muster",
      email: "timo.muster@example.test",
      externalContactId: "TEST-TIMO",
      seasonMemberships: {
        create: { seasonId: season.id, ageGroupId: u9.id, targetHours: 15 },
      },
    },
  });
  await prisma.user.upsert({
    where: { email: "timo.muster@example.test" },
    update: { passwordHash, role: "MITGLIED", isActive: true, memberId: timo.id },
    create: { email: "timo.muster@example.test", passwordHash, role: "MITGLIED", memberId: timo.id },
  });

  // Funktionär
  const funkMember = await prisma.member.upsert({
    where: { externalContactId: "TEST-FUNK" },
    update: {},
    create: { firstName: "Nora", lastName: "Beispiel", email: "funktionaer@example.test", externalContactId: "TEST-FUNK" },
  });
  await prisma.user.upsert({
    where: { email: "funktionaer@example.test" },
    update: { passwordHash, role: "FUNKTIONAER", isActive: true, memberId: funkMember.id },
    create: {
      email: "funktionaer@example.test",
      passwordHash,
      role: "FUNKTIONAER",
      memberId: funkMember.id,
    },
  });

  // Stufenleiter for U14
  const slMember = await prisma.member.upsert({
    where: { externalContactId: "TEST-SL" },
    update: {},
    create: { firstName: "Peter", lastName: "Stufenchef", email: "stufenleiter@example.test", externalContactId: "TEST-SL" },
  });
  const slUser = await prisma.user.upsert({
    where: { email: "stufenleiter@example.test" },
    update: { passwordHash, role: "STUFENLEITER", isActive: true, memberId: slMember.id },
    create: {
      email: "stufenleiter@example.test",
      passwordHash,
      role: "STUFENLEITER",
      memberId: slMember.id,
    },
  });
  await prisma.stufenleiterAssignment.upsert({
    where: { userId_ageGroupId: { userId: slUser.id, ageGroupId: u14.id } },
    update: {},
    create: { userId: slUser.id, ageGroupId: u14.id },
  });

  console.log("Test users ready (password: TestPass123!):");
  console.log("- Mitglied Lara (U14, eigener Login): lara.muster@example.test");
  console.log("- Mitglied Timo (U9, eigener Login): timo.muster@example.test");
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
