-- Add general settings fields to AppSettings
ALTER TABLE "app_settings"
  ADD COLUMN IF NOT EXISTS "companyName" TEXT NOT NULL DEFAULT 'Corporate Recruiters Inc.',
  ADD COLUMN IF NOT EXISTS "intakeEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "aiScoringEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "defaultFollowUpDays" INTEGER NOT NULL DEFAULT 3;
