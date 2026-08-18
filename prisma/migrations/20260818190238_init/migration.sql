-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GESCHAEFTSSTELLE', 'STUFENLEITER', 'FUNKTIONAER', 'MITGLIED');

-- CreateEnum
CREATE TYPE "ShiftArea" AS ENUM ('HELFER', 'FUNKTIONAER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('GAME', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "SignupPayoutType" AS ENUM ('HELFERKONTINGENT', 'PAUSCHALE', 'BARBEZUG');

-- CreateEnum
CREATE TYPE "SignupStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MailTemplateKey" AS ENUM ('SIGNUP_CONFIRMATION', 'REMINDER_UNFILLED', 'ACCOUNT_SETUP', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "AuthTokenPurpose" AS ENUM ('ACCOUNT_SETUP', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgeGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggersBarbezugChoice" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AgeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultArea" "ShiftArea",
    "requiresPayoutChoice" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "iban" TEXT,
    "externalContactId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonMembership" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "ageGroupId" TEXT NOT NULL,
    "targetHours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StufenleiterAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ageGroupId" TEXT NOT NULL,

    CONSTRAINT "StufenleiterAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "title" TEXT NOT NULL,
    "opponent" TEXT,
    "locationId" TEXT,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "externalRef" TEXT,
    "importBatchId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSlot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "area" "ShiftArea" NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "creditHours" DECIMAL(4,2) NOT NULL,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ShiftSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSlotAgeGroup" (
    "id" TEXT NOT NULL,
    "shiftSlotId" TEXT NOT NULL,
    "ageGroupId" TEXT NOT NULL,

    CONSTRAINT "ShiftSlotAgeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signup" (
    "id" TEXT NOT NULL,
    "shiftSlotId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "ageGroupSnapshot" TEXT NOT NULL,
    "helperFirstName" TEXT NOT NULL,
    "helperLastName" TEXT NOT NULL,
    "helperEmail" TEXT NOT NULL,
    "helperPhone" TEXT,
    "payoutType" "SignupPayoutType" NOT NULL DEFAULT 'HELFERKONTINGENT',
    "ibanSnapshot" TEXT,
    "status" "SignupStatus" NOT NULL DEFAULT 'CONFIRMED',
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailTemplate" (
    "id" TEXT NOT NULL,
    "key" "MailTemplateKey" NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "templateKey" "MailTemplateKey" NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_label_key" ON "Season"("label");

-- CreateIndex
CREATE UNIQUE INDEX "AgeGroup_name_key" ON "AgeGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_name_key" ON "Activity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Member_externalContactId_key" ON "Member"("externalContactId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonMembership_memberId_seasonId_key" ON "SeasonMembership"("memberId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_memberId_key" ON "User"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_purpose_idx" ON "AuthToken"("userId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "StufenleiterAssignment_userId_ageGroupId_key" ON "StufenleiterAssignment"("userId", "ageGroupId");

-- CreateIndex
CREATE INDEX "Event_seasonId_startDateTime_idx" ON "Event"("seasonId", "startDateTime");

-- CreateIndex
CREATE INDEX "ShiftSlot_eventId_idx" ON "ShiftSlot"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftSlotAgeGroup_shiftSlotId_ageGroupId_key" ON "ShiftSlotAgeGroup"("shiftSlotId", "ageGroupId");

-- CreateIndex
CREATE INDEX "Signup_shiftSlotId_status_idx" ON "Signup"("shiftSlotId", "status");

-- CreateIndex
CREATE INDEX "Signup_memberId_status_idx" ON "Signup"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MailTemplate_key_key" ON "MailTemplate"("key");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- AddForeignKey
ALTER TABLE "SeasonMembership" ADD CONSTRAINT "SeasonMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonMembership" ADD CONSTRAINT "SeasonMembership_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonMembership" ADD CONSTRAINT "SeasonMembership_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "AgeGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StufenleiterAssignment" ADD CONSTRAINT "StufenleiterAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StufenleiterAssignment" ADD CONSTRAINT "StufenleiterAssignment_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "AgeGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSlot" ADD CONSTRAINT "ShiftSlot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSlot" ADD CONSTRAINT "ShiftSlot_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSlotAgeGroup" ADD CONSTRAINT "ShiftSlotAgeGroup_shiftSlotId_fkey" FOREIGN KEY ("shiftSlotId") REFERENCES "ShiftSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSlotAgeGroup" ADD CONSTRAINT "ShiftSlotAgeGroup_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "AgeGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signup" ADD CONSTRAINT "Signup_shiftSlotId_fkey" FOREIGN KEY ("shiftSlotId") REFERENCES "ShiftSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signup" ADD CONSTRAINT "Signup_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
