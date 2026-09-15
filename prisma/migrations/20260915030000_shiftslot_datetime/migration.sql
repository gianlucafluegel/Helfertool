-- Move startDateTime/endDateTime from Event to ShiftSlot — time is now
-- defined per role instead of shared across the whole Einsatz, so a big
-- external event with roles at different times (e.g. a festival) can be
-- ONE Event with many differently-timed ShiftSlots instead of one Event
-- per unique time. Applies to every event type, including GAME.
--
-- Applied manually via prisma.$executeRawUnsafe with a data-safe sequence
-- (add nullable columns -> backfill -> verify zero rows missed -> set NOT
-- NULL -> drop old Event columns) before this file was written, then
-- recorded here and marked applied via `prisma migrate resolve --applied`.
--
-- Event.endDateTime was nullable and a few pre-existing rows could have had
-- it NULL (games created before mandatory end-time validation, or
-- isManualEntry rows from the "Manuelle Stunden"-Formular, which never set
-- an end at all). ShiftSlot.endDateTime must end up NOT NULL, so those rows
-- are backfilled with a synthesized end (startDateTime + creditHours),
-- matching the same fallback addManualHours now writes going forward.

-- AlterTable
ALTER TABLE "ShiftSlot" ADD COLUMN "startDateTime" TIMESTAMP(3);
ALTER TABLE "ShiftSlot" ADD COLUMN "endDateTime" TIMESTAMP(3);

-- Backfill
UPDATE "ShiftSlot" s
SET "startDateTime" = e."startDateTime",
    "endDateTime" = COALESCE(
      e."endDateTime",
      e."startDateTime" + make_interval(secs => (s."creditHours" * 3600)::double precision)
    )
FROM "Event" e
WHERE s."eventId" = e.id;

-- AlterTable
ALTER TABLE "ShiftSlot" ALTER COLUMN "startDateTime" SET NOT NULL;
ALTER TABLE "ShiftSlot" ALTER COLUMN "endDateTime" SET NOT NULL;

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "startDateTime";
ALTER TABLE "Event" DROP COLUMN "endDateTime";

-- CreateIndex
CREATE INDEX "ShiftSlot_startDateTime_idx" ON "ShiftSlot"("startDateTime");
