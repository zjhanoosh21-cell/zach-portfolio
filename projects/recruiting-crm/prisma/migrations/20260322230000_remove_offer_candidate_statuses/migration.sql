-- Remove OFFER_EXTENDED, OFFER_ACCEPTED, OFFER_DECLINED from CandidateStatus enum.
-- PostgreSQL does not support DROP VALUE on enums, so we recreate the type.

-- 1. Reset any rows that have the to-be-removed values
UPDATE "candidates" SET "status" = 'ACTIVE'
  WHERE "status"::text IN ('OFFER_EXTENDED', 'OFFER_ACCEPTED', 'OFFER_DECLINED');

-- 2. Drop the column default so we can swap the type
ALTER TABLE "candidates" ALTER COLUMN "status" DROP DEFAULT;

-- 3. Create the new enum without the offer values
CREATE TYPE "CandidateStatus_new" AS ENUM (
  'NEW', 'REVIEWED', 'ACTIVE', 'SUBMITTED', 'INTERVIEWING',
  'PLACED', 'ON_HOLD', 'REJECTED', 'DO_NOT_SUBMIT'
);

-- 4. Migrate the column
ALTER TABLE "candidates"
  ALTER COLUMN "status" TYPE "CandidateStatus_new"
  USING "status"::text::"CandidateStatus_new";

-- 5. Restore the default using the new type
ALTER TABLE "candidates" ALTER COLUMN "status" SET DEFAULT 'NEW'::"CandidateStatus_new";

-- 6. Swap type names
DROP TYPE "CandidateStatus";
ALTER TYPE "CandidateStatus_new" RENAME TO "CandidateStatus";
