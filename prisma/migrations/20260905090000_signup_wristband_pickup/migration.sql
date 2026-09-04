-- CreateEnum
CREATE TYPE "WristbandPickupLocation" AS ENUM ('GESCHAEFTSSTELLE', 'TRAINING');

-- AlterTable
ALTER TABLE "Signup" ADD COLUMN     "wristbandPickup" "WristbandPickupLocation";
