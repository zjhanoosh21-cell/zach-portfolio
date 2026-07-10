-- Add resumateId to candidates for RESUMate import deduplication.
-- Unique nullable: each record maps to at most one RESUMate candidate ID.

ALTER TABLE "candidates" ADD COLUMN "resumateId" TEXT;
CREATE UNIQUE INDEX "candidates_resumateId_key" ON "candidates"("resumateId") WHERE "resumateId" IS NOT NULL;
