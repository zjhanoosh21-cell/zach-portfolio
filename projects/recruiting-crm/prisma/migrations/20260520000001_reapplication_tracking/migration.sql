-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'REAPPLIED';
ALTER TYPE "ActivityType" ADD VALUE 'STATUS_REOPENED';

-- AlterTable
ALTER TABLE "candidates"
  ADD COLUMN "pastAppliedRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "lastReappliedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "candidates_lastReappliedAt_idx" ON "candidates"("lastReappliedAt");
