-- Replace Event.opponent (nullable) with Event.description (required):
-- "Beschreibung des Einsatzes" replaces the games-only "Gegner" field so it
-- also makes sense for external events.
ALTER TABLE "Event" DROP COLUMN "opponent";
ALTER TABLE "Event" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Event" ALTER COLUMN "description" DROP DEFAULT;
