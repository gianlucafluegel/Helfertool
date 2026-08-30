-- CreateEnum
CREATE TYPE "MemberCategory" AS ENUM ('NACHWUCHS', 'AKTIV');

-- AlterTable
ALTER TABLE "AgeGroup" ADD COLUMN     "category" "MemberCategory" NOT NULL DEFAULT 'NACHWUCHS';

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "category" "MemberCategory";

-- DropIndex
DROP INDEX "Member_externalContactId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Member_externalContactId_category_key" ON "Member"("externalContactId", "category");
