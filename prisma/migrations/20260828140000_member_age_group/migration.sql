-- AlterTable
ALTER TABLE "Member" ADD COLUMN "ageGroupId" TEXT;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "AgeGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
