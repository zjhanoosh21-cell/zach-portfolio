-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('NEW', 'REVIEWED', 'ACTIVE', 'SUBMITTED', 'INTERVIEWING', 'PLACED', 'ON_HOLD', 'REJECTED', 'DO_NOT_SUBMIT');

-- CreateEnum
CREATE TYPE "CandidateTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3', 'TIER_4');

-- CreateEnum
CREATE TYPE "TriageAction" AS ENUM ('ADVANCE_PRIORITY_CALL', 'ADVANCE_SCHEDULE_REVIEW', 'HOLD_RECRUITER_JUDGMENT', 'PASS_DO_NOT_SUBMIT');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('LEGAL_SECRETARY', 'LEGAL_ASSISTANT', 'PARALEGAL', 'BILLING_CLERK', 'BILLING_COORDINATOR', 'OTHER_LEGAL', 'OTHER_PROFESSIONAL', 'NON_LEGAL');

-- CreateEnum
CREATE TYPE "JobOrderStatus" AS ENUM ('OPEN', 'ON_HOLD', 'FILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobOrderType" AS ENUM ('DIRECT_HIRE', 'TEMP_TO_HIRE', 'TEMP', 'CONTRACT');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'CLIENT_REVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER_EXTENDED', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'REJECTED_BY_CLIENT', 'CANDIDATE_WITHDREW', 'PLACED');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('GENERAL', 'PHONE_SCREEN', 'INTERVIEW_NOTES', 'REFERENCE_CHECK', 'CLIENT_FEEDBACK', 'INTERNAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('STATUS_CHANGED', 'NOTE_ADDED', 'SUBMITTED_TO_JOB', 'SUBMISSION_STATUS_CHANGED', 'RESUME_VIEWED', 'INTAKE_FROM_N8N', 'CANDIDATE_CREATED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "specialty" TEXT,
    "city" TEXT,
    "state" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT,
    "resumeEmail" TEXT,
    "resumePhone" TEXT,
    "linkedinUrl" TEXT,
    "candidateCity" TEXT,
    "candidateState" TEXT,
    "candidateLocation" TEXT,
    "currentEmployer" TEXT,
    "currentTitle" TEXT,
    "yearsOfExperience" INTEGER,
    "workHistorySummary" TEXT,
    "educationDegree" TEXT,
    "educationMajor" TEXT,
    "educationInstitution" TEXT,
    "educationYear" INTEGER,
    "certifications" TEXT[],
    "barAdmissions" TEXT[],
    "languages" TEXT[],
    "availabilityNotes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ZipRecruiter',
    "appliedRole" TEXT,
    "intakeEmailMessageId" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'NEW',
    "aiCompositeScore" INTEGER,
    "aiTier" "CandidateTier",
    "aiTriageAction" "TriageAction",
    "aiDetectedRoleType" "RoleType",
    "scoreLawFirmExp" INTEGER,
    "scoreLongevity" INTEGER,
    "scoreTitleSpecific" INTEGER,
    "scoreTechnicalSkills" INTEGER,
    "scoreProfessionalism" INTEGER,
    "practiceAreas" TEXT[],
    "keySkills" TEXT[],
    "topStrengths" TEXT[],
    "topConcerns" TEXT[],
    "riskFlags" TEXT[],
    "aiSummary" TEXT,
    "aiRawOutput" JSONB,
    "resumeFileName" TEXT,
    "resumeMimeType" TEXT,
    "resumeStoragePath" TEXT,
    "resumeUploadedAt" TIMESTAMP(3),

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_orders" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL,
    "location" TEXT,
    "jobType" "JobOrderType" NOT NULL DEFAULT 'DIRECT_HIRE',
    "status" "JobOrderStatus" NOT NULL DEFAULT 'OPEN',
    "roleType" "RoleType",
    "practiceAreas" TEXT[],
    "requiredSkills" TEXT[],
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "billRate" DECIMAL(8,2),
    "payRate" DECIMAL(8,2),
    "priority" INTEGER NOT NULL DEFAULT 2,
    "description" TEXT,
    "internalNotes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetFillDate" TIMESTAMP(3),
    "filledAt" TIMESTAMP(3),

    CONSTRAINT "job_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobOrderId" TEXT NOT NULL,
    "submittedById" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "clientFeedback" TEXT,
    "interviewDate" TIMESTAMP(3),
    "offerAmount" INTEGER,
    "placedAt" TIMESTAMP(3),
    "placementFee" DECIMAL(10,2),

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "type" "NoteType" NOT NULL DEFAULT 'GENERAL',
    "authorId" TEXT,
    "candidateId" TEXT,
    "jobOrderId" TEXT,
    "submissionId" TEXT,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "userId" TEXT,
    "candidateId" TEXT,
    "jobOrderId" TEXT,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "client_contacts_clientId_idx" ON "client_contacts"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_intakeEmailMessageId_key" ON "candidates"("intakeEmailMessageId");

-- CreateIndex
CREATE INDEX "candidates_aiCompositeScore_idx" ON "candidates"("aiCompositeScore");

-- CreateIndex
CREATE INDEX "candidates_aiTier_idx" ON "candidates"("aiTier");

-- CreateIndex
CREATE INDEX "candidates_status_idx" ON "candidates"("status");

-- CreateIndex
CREATE INDEX "candidates_createdAt_idx" ON "candidates"("createdAt");

-- CreateIndex
CREATE INDEX "candidates_candidateState_idx" ON "candidates"("candidateState");

-- CreateIndex
CREATE INDEX "candidates_aiDetectedRoleType_idx" ON "candidates"("aiDetectedRoleType");

-- CreateIndex
CREATE INDEX "job_orders_status_idx" ON "job_orders"("status");

-- CreateIndex
CREATE INDEX "job_orders_roleType_idx" ON "job_orders"("roleType");

-- CreateIndex
CREATE INDEX "job_orders_clientId_idx" ON "job_orders"("clientId");

-- CreateIndex
CREATE INDEX "submissions_candidateId_idx" ON "submissions"("candidateId");

-- CreateIndex
CREATE INDEX "submissions_jobOrderId_idx" ON "submissions"("jobOrderId");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_candidateId_jobOrderId_key" ON "submissions"("candidateId", "jobOrderId");

-- CreateIndex
CREATE INDEX "notes_candidateId_idx" ON "notes"("candidateId");

-- CreateIndex
CREATE INDEX "notes_jobOrderId_idx" ON "notes"("jobOrderId");

-- CreateIndex
CREATE INDEX "notes_submissionId_idx" ON "notes"("submissionId");

-- CreateIndex
CREATE INDEX "activity_log_candidateId_idx" ON "activity_log"("candidateId");

-- CreateIndex
CREATE INDEX "activity_log_jobOrderId_idx" ON "activity_log"("jobOrderId");

-- CreateIndex
CREATE INDEX "activity_log_createdAt_idx" ON "activity_log"("createdAt");

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_jobOrderId_fkey" FOREIGN KEY ("jobOrderId") REFERENCES "job_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_jobOrderId_fkey" FOREIGN KEY ("jobOrderId") REFERENCES "job_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_jobOrderId_fkey" FOREIGN KEY ("jobOrderId") REFERENCES "job_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
