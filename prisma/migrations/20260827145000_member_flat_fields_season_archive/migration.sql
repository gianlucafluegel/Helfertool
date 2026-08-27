-- DropForeignKey
ALTER TABLE "SeasonMembership" DROP CONSTRAINT "SeasonMembership_memberId_fkey";
ALTER TABLE "SeasonMembership" DROP CONSTRAINT "SeasonMembership_seasonId_fkey";
ALTER TABLE "SeasonMembership" DROP CONSTRAINT "SeasonMembership_ageGroupId_fkey";

-- DropTable
DROP TABLE "SeasonMembership";

-- AlterTable
ALTER TABLE "Member"
  ADD COLUMN "age" INTEGER,
  ADD COLUMN "targetHours" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "importBatchId" TEXT;

-- CreateTable
CREATE TABLE "SeasonArchive" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "SeasonArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonArchive_seasonId_key" ON "SeasonArchive"("seasonId");

-- AddForeignKey
ALTER TABLE "SeasonArchive" ADD CONSTRAINT "SeasonArchive_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
