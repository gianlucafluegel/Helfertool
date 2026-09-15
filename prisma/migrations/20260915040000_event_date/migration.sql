-- Add Event.date back — a Helfereinsatz happens on exactly one calendar
-- day, shared by all its roles; Start/Ende (time of day) stay per-role on
-- ShiftSlot. This corrects the prior migration, which had moved the whole
-- date+time onto ShiftSlot with no day shared across roles at all.
--
-- Applied manually via prisma.$executeRawUnsafe with a data-safe sequence
-- (add nullable column -> backfill from the earliest ShiftSlot per event,
-- truncated to its date, falling back to Event.createdAt for events with
-- no ShiftSlot at all -> verify zero rows missed -> set NOT NULL) before
-- this file was written, then recorded here and marked applied via
-- `prisma migrate resolve --applied`.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "date" TIMESTAMP(3);

-- Backfill
UPDATE "Event" e
SET "date" = date_trunc('day', sub.min_start)
FROM (
  SELECT "eventId", min("startDateTime") AS min_start
  FROM "ShiftSlot"
  GROUP BY "eventId"
) sub
WHERE sub."eventId" = e.id;

UPDATE "Event"
SET "date" = date_trunc('day', "createdAt")
WHERE "date" IS NULL;

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "date" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Event_seasonId_date_idx" ON "Event"("seasonId", "date");
