-- Add placedAt to candidates table.
-- Records when a candidate was placed (set when a submission status → PLACED).
-- Allows future analytics queries like "candidates placed in Q2" without joining through Submissions.
ALTER TABLE "candidates" ADD COLUMN "placedAt" TIMESTAMP(3);

-- Update FK constraints on optional User relations to use ON DELETE SET NULL.
-- Without this, deleting a User who has assigned jobs, submissions, notes, activity logs, or
-- discussions would throw a FK violation error. SET NULL is correct for all 5 relations since
-- the FK fields are all Optional (String?).

-- JobOrder.assignedToId
ALTER TABLE "job_orders" DROP CONSTRAINT "job_orders_assignedToId_fkey";
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Submission.submittedById
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_submittedById_fkey";
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note.authorId
ALTER TABLE "notes" DROP CONSTRAINT "notes_authorId_fkey";
ALTER TABLE "notes" ADD CONSTRAINT "notes_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ActivityLog.userId
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_userId_fkey";
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Discussion.authorId
ALTER TABLE "discussions" DROP CONSTRAINT "discussions_authorId_fkey";
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
