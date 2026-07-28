/*
  Warnings:

  - You are about to drop the column `driverInstructions` on the `ItineraryDay` table. All the data in the column will be lost.
  - You are about to drop the column `guideInstructions` on the `ItineraryDay` table. All the data in the column will be lost.
  - You are about to drop the column `internalNotes` on the `ItineraryDay` table. All the data in the column will be lost.
  - You are about to drop the column `internalNotes` on the `ItineraryItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ItineraryDay" DROP COLUMN "driverInstructions",
DROP COLUMN "guideInstructions",
DROP COLUMN "internalNotes";

-- AlterTable
ALTER TABLE "ItineraryItem" DROP COLUMN "internalNotes";
