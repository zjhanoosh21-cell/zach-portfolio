-- Migrate candidates with SUBMITTED or INTERVIEWING status to ACTIVE
UPDATE "candidates" SET "status" = 'ACTIVE'::"CandidateStatus"
  WHERE "status"::text IN ('SUBMITTED', 'INTERVIEWING');

-- Drop default before recreating the enum type
ALTER TABLE "candidates" ALTER COLUMN "status" DROP DEFAULT;

-- Create the new enum without SUBMITTED and INTERVIEWING
CREATE TYPE "CandidateStatus_new" AS ENUM (
  'NEW',
  'REVIEWED',
  'ACTIVE',
  'PLACED',
  'ON_HOLD',
  'REJECTED',
  'DO_NOT_SUBMIT'
);

-- Alter column to use new type
ALTER TABLE "candidates" ALTER COLUMN "status" TYPE "CandidateStatus_new"
  USING "status"::text::"CandidateStatus_new";

-- Restore default
ALTER TABLE "candidates" ALTER COLUMN "status" SET DEFAULT 'NEW'::"CandidateStatus_new";

-- Drop old type and rename new one
DROP TYPE "CandidateStatus";
ALTER TYPE "CandidateStatus_new" RENAME TO "CandidateStatus";
