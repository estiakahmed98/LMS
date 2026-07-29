-- Manual grading and maker-checker workflow for WRITTEN / PRACTICAL
-- submissions. Keeps learner-visible final marks separate from draft maker
-- marks and checker approval.

CREATE TYPE "ManualReviewStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING_MAKER',
  'MAKER_DRAFT',
  'PENDING_CHECKER',
  'RETURNED_TO_MAKER',
  'FINALIZED'
);

ALTER TABLE "submissions"
ADD COLUMN IF NOT EXISTS "manualReviewStatus" "ManualReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN IF NOT EXISTS "makerTotalMarks" INTEGER,
ADD COLUMN IF NOT EXISTS "makerId" TEXT,
ADD COLUMN IF NOT EXISTS "makerMarkedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "makerSubmittedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "makerComment" TEXT,
ADD COLUMN IF NOT EXISTS "checkerTotalMarks" INTEGER,
ADD COLUMN IF NOT EXISTS "checkerId" TEXT,
ADD COLUMN IF NOT EXISTS "checkedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "checkerComment" TEXT,
ADD COLUMN IF NOT EXISTS "returnReason" TEXT;

ALTER TABLE "submissions"
ADD CONSTRAINT "submissions_makerId_fkey"
FOREIGN KEY ("makerId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "submissions"
ADD CONSTRAINT "submissions_checkerId_fkey"
FOREIGN KEY ("checkerId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "submission_question_grades" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "makerMarks" INTEGER,
  "makerComment" TEXT,
  "checkerMarks" INTEGER,
  "checkerComment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "submission_question_grades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "submission_question_grades_submissionId_questionId_key"
ON "submission_question_grades"("submissionId", "questionId");

CREATE INDEX "submission_question_grades_questionId_idx"
ON "submission_question_grades"("questionId");

CREATE INDEX "submissions_manualReviewStatus_updatedAt_idx"
ON "submissions"("manualReviewStatus", "updatedAt");

CREATE INDEX "submissions_makerId_idx"
ON "submissions"("makerId");

CREATE INDEX "submissions_checkerId_idx"
ON "submissions"("checkerId");

ALTER TABLE "submission_question_grades"
ADD CONSTRAINT "submission_question_grades_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "submissions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "submission_question_grades"
ADD CONSTRAINT "submission_question_grades_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "questions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing WRITTEN / PRACTICAL submissions that are already finalized become
-- FINALIZED; unfinished ones wait for the maker queue.
UPDATE "submissions" AS s
SET "manualReviewStatus" = CASE
  WHEN s."status" IN ('GRADED', 'REVIEWED') AND s."obtainedMarks" IS NOT NULL THEN 'FINALIZED'::"ManualReviewStatus"
  ELSE 'PENDING_MAKER'::"ManualReviewStatus"
END
FROM "assessments" AS a
WHERE a."id" = s."assessmentId"
  AND a."type" IN ('WRITTEN', 'PRACTICAL');
