-- Rename CandidateStatus enum value: DO_NOT_SUBMIT -> DO_NOT_CONSIDER
-- PostgreSQL 10+ supports RENAME VALUE. No data migration needed — all rows automatically
-- use the new value name after the rename.
ALTER TYPE "CandidateStatus" RENAME VALUE 'DO_NOT_SUBMIT' TO 'DO_NOT_CONSIDER';

-- Add isDuplicate flag to candidates.
-- Set to true automatically when intake creates a record matching an existing candidate name.
-- Recruiters can dismiss the flag once they've reviewed it.
ALTER TABLE "candidates" ADD COLUMN "isDuplicate" BOOLEAN NOT NULL DEFAULT false;

-- Add per-user profile field visibility preferences (JSON).
-- Stores { visible: string[] } — list of field names shown in candidate profile view mode.
-- NULL means "show all fields" (default behavior, no prefs set yet).
ALTER TABLE "users" ADD COLUMN "profileFieldPrefs" JSONB;
