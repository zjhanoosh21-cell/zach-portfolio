-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "manualScore" INTEGER,
ADD COLUMN     "useManualScore" BOOLEAN NOT NULL DEFAULT false;
