-- Add effectiveScore as a PostgreSQL stored generated column.
-- Automatically computes: manualScore if useManualScore=true, else aiCompositeScore.
-- Prisma sorts by this column for score-based ordering so manual overrides are respected.

ALTER TABLE "candidates"
  ADD COLUMN "effectiveScore" INTEGER GENERATED ALWAYS AS (
    CASE WHEN "useManualScore" = true AND "manualScore" IS NOT NULL
      THEN "manualScore"
      ELSE "aiCompositeScore"
    END
  ) STORED;

CREATE INDEX "Candidate_effectiveScore_idx" ON "candidates"("effectiveScore");
