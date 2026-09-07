-- Keine Tätigkeit soll exklusiv für Funktionäre verfügbar sein: bestehende
-- Rollen (nicht manuell erfasste Stunden), die über Activity.defaultArea auf
-- "FUNKTIONAER" gesetzt wurden, werden auf "HELFER" zurückgesetzt, bevor die
-- Spalte selbst entfernt wird.
UPDATE "ShiftSlot" SET area = 'HELFER' WHERE area = 'FUNKTIONAER' AND "eventId" IN (SELECT id FROM "Event" WHERE "isManualEntry" = false);

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "defaultArea";
