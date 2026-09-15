-- Move Anforderungen (requirements) from Event to ShiftSlot, one role
-- instead of the whole external event can have its own requirements.
--
-- Applied manually via prisma.$executeRawUnsafe with a data-safe sequence
-- (add nullable column -> backfill from Event.requirements -> verify zero
-- rows missed -> drop old column) before this file was written, then
-- recorded here and marked applied via `prisma migrate resolve --applied`.
-- Kept nullable (unlike ShiftSlot.description) since Anforderungen only
-- applies to EXTERNAL events and stays optional per role.

ALTER TABLE "ShiftSlot" ADD COLUMN "requirements" TEXT;

UPDATE "ShiftSlot" s
SET "requirements" = e."requirements"
FROM "Event" e
WHERE s."eventId" = e.id AND e."requirements" IS NOT NULL;

ALTER TABLE "Event" DROP COLUMN "requirements";
