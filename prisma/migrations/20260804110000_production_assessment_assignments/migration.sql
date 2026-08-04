CREATE TYPE "AssessmentAssignmentTarget" AS ENUM ('COURSE', 'BATCH', 'LEARNER');
CREATE TYPE "AssessmentAssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

ALTER TABLE "batches"
  ADD COLUMN "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "startDate" TIMESTAMP(3),
  ADD COLUMN "endDate" TIMESTAMP(3);

ALTER TABLE "submissions" ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1;
DROP INDEX "submissions_assessmentId_userId_key";
CREATE UNIQUE INDEX "submissions_assessmentId_userId_attemptNumber_key"
  ON "submissions"("assessmentId", "userId", "attemptNumber");

CREATE TABLE "batch_memberships" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batch_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_assignments" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "targetType" "AssessmentAssignmentTarget" NOT NULL,
  "targetKey" TEXT NOT NULL,
  "batchId" TEXT,
  "learnerId" TEXT,
  "status" "AssessmentAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
  "availableFrom" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "attemptLimit" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assessment_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "batch_memberships_batchId_userId_key" ON "batch_memberships"("batchId", "userId");
CREATE INDEX "batch_memberships_userId_idx" ON "batch_memberships"("userId");
CREATE UNIQUE INDEX "assessment_assignments_assessmentId_targetKey_key" ON "assessment_assignments"("assessmentId", "targetKey");
CREATE INDEX "assessment_assignments_assessmentId_status_idx" ON "assessment_assignments"("assessmentId", "status");
CREATE INDEX "assessment_assignments_batchId_idx" ON "assessment_assignments"("batchId");
CREATE INDEX "assessment_assignments_learnerId_idx" ON "assessment_assignments"("learnerId");

ALTER TABLE "batch_memberships" ADD CONSTRAINT "batch_memberships_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_memberships" ADD CONSTRAINT "batch_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "assessment_assignments" (
  "id", "assessmentId", "targetType", "targetKey", "status",
  "attemptLimit", "createdAt", "updatedAt"
)
SELECT
  'legacy_course_' || "id", "id", 'COURSE', 'COURSE', 'PUBLISHED',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "assessments";
