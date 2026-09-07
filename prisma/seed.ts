import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const season = await prisma.season.upsert({
    where: { label: "2026/2027" },
    update: {},
    create: {
      label: "2026/2027",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2027-06-30"),
    },
  });

  const ageGroupDefs = [
    { name: "U9", sortOrder: 1, triggersBarbezugChoice: true, category: "NACHWUCHS" as const },
    { name: "U12", sortOrder: 2, triggersBarbezugChoice: true, category: "NACHWUCHS" as const },
    { name: "U14", sortOrder: 3, triggersBarbezugChoice: false, category: "NACHWUCHS" as const },
    { name: "U16", sortOrder: 4, triggersBarbezugChoice: false, category: "NACHWUCHS" as const },
    { name: "U18", sortOrder: 5, triggersBarbezugChoice: false, category: "NACHWUCHS" as const },
    { name: "U21", sortOrder: 6, triggersBarbezugChoice: false, category: "NACHWUCHS" as const },
    { name: "3. Liga", sortOrder: 7, triggersBarbezugChoice: false, category: "AKTIV" as const },
    { name: "4. Liga", sortOrder: 8, triggersBarbezugChoice: false, category: "AKTIV" as const },
    { name: "SWHL B", sortOrder: 9, triggersBarbezugChoice: false, category: "AKTIV" as const },
    { name: "SWHL C", sortOrder: 10, triggersBarbezugChoice: false, category: "AKTIV" as const },
    {
      name: "Senioren",
      sortOrder: 11,
      triggersBarbezugChoice: false,
      category: "AKTIV" as const,
      // Keine Helferpflicht, wird nur selten gebraucht — Login/Einschreiben
      // funktioniert normal, taucht aber nicht im Team-Filter (Spiele &
      // Events) oder in der Reminder-Gruppenauswahl auf.
      visibleInTeamFilters: false,
    },
  ];
  for (const def of ageGroupDefs) {
    await prisma.ageGroup.upsert({
      where: { name: def.name },
      update: {
        sortOrder: def.sortOrder,
        triggersBarbezugChoice: def.triggersBarbezugChoice,
        category: def.category,
        visibleInTeamFilters: "visibleInTeamFilters" in def ? def.visibleInTeamFilters : true,
      },
      create: def,
    });
  }

  const activityDefs = [
    { name: "Strafbankbetreuer", requiresPayoutChoice: false },
    { name: "Speaker", requiresPayoutChoice: false },
    { name: "Matchuhr", requiresPayoutChoice: false },
    { name: "Schiedsrichter", requiresPayoutChoice: true },
    { name: "Reporter", requiresPayoutChoice: false },
    { name: "Helfer (allgemein)", requiresPayoutChoice: false },
  ];
  for (const def of activityDefs) {
    await prisma.activity.upsert({
      where: { name: def.name },
      update: { requiresPayoutChoice: def.requiresPayoutChoice },
      create: def,
    });
  }

  const locationDefs = ["Sagibach Wichtrach", "Grabengut Thun"];
  for (const name of locationDefs) {
    await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const templateDefs: {
    key: "SIGNUP_CONFIRMATION" | "REMINDER_UNFILLED" | "ACCOUNT_SETUP" | "PASSWORD_RESET";
    subject: string;
    bodyText: string;
  }[] = [
    {
      key: "SIGNUP_CONFIRMATION",
      subject: "Bestätigung: Dein Helfereinsatz bei {{event}}",
      bodyText:
        "Hallo {{vorname}} {{nachname}}\n\n" +
        "Danke für deine Anmeldung als {{taetigkeit}} beim Einsatz {{event}} am {{datum}} in {{standort}}.\n\n" +
        "Bei Fragen oder falls du dich abmelden musst, findest du deine Einsätze jederzeit unter 'Mein Konto'.\n\n" +
        "Sportliche Grüsse\nHC Dragon Thun",
    },
    {
      key: "REMINDER_UNFILLED",
      subject: "Erinnerung: Noch offene Helfereinsätze",
      bodyText:
        "Hallo {{vorname}} {{nachname}}\n\n" +
        "Für {{event}} am {{datum}} in {{standort}} sind noch nicht alle Helfereinsätze besetzt. " +
        "Bitte prüft, ob ihr unterstützen könnt, damit der Spielbetrieb gewährleistet ist.\n\n" +
        "Sportliche Grüsse\nHC Dragon Thun",
    },
    {
      key: "ACCOUNT_SETUP",
      subject: "Willkommen beim Helfertool HC Dragon Thun",
      bodyText:
        "Hallo {{vorname}} {{nachname}}\n\n" +
        "Für dich wurde ein Zugang zum Helfertool erstellt. Bitte setze über folgenden Link dein Passwort:\n\n" +
        "{{link}}\n\n" +
        "Der Link ist 48 Stunden gültig.\n\n" +
        "Sportliche Grüsse\nHC Dragon Thun",
    },
    {
      key: "PASSWORD_RESET",
      subject: "Passwort zurücksetzen – Helfertool HC Dragon Thun",
      bodyText:
        "Hallo {{vorname}} {{nachname}}\n\n" +
        "Über folgenden Link kannst du dein Passwort zurücksetzen:\n\n" +
        "{{link}}\n\n" +
        "Der Link ist 2 Stunden gültig. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.\n\n" +
        "Sportliche Grüsse\nHC Dragon Thun",
    },
  ];
  for (const def of templateDefs) {
    await prisma.mailTemplate.upsert({
      where: { key: def.key },
      update: {},
      create: def,
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        passwordHash,
        role: "GESCHAEFTSSTELLE",
      },
    });
    console.log(`Admin user ready: ${adminEmail}`);
  } else {
    console.log(
      "SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin user creation.",
    );
  }

  console.log(`Seed complete. Season: ${season.label}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
