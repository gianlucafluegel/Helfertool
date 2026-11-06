-- AlterTable
ALTER TABLE "Member" ADD COLUMN "isExternalHelper" BOOLEAN NOT NULL DEFAULT false;

-- Sammelperson "Externer Helfer" (genau eine), damit externe Personen
-- Rollen zugeordnet werden können, ohne als Mitglied erfasst zu sein.
INSERT INTO "Member" ("id", "firstName", "lastName", "isExternalHelper", "updatedAt")
SELECT 'externer-helfer', 'Externer', 'Helfer', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Member" WHERE "isExternalHelper" = true);
