-- Einsatzbeschrieb wandert von Event (geteilt über alle Rollen) zu ShiftSlot
-- (pro Rolle) — unterschiedliche Rollen desselben Einsatzes können
-- unterschiedliche Aufgaben beschreiben. Bestehende Rollen werden mit dem
-- bisherigen Event.description ihres Einsatzes vorbefüllt, bevor die alte
-- Event-Spalte entfernt wird.

-- AlterTable
ALTER TABLE "ShiftSlot" ADD COLUMN "description" TEXT;

-- Backfill
UPDATE "ShiftSlot" s SET description = e.description FROM "Event" e WHERE s."eventId" = e.id;

-- AlterTable
ALTER TABLE "ShiftSlot" ALTER COLUMN "description" SET NOT NULL;
ALTER TABLE "ShiftSlot" DROP COLUMN "notes";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "description";
