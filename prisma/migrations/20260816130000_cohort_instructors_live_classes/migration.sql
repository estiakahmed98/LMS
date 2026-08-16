CREATE TYPE "BatchInstructorRole" AS ENUM ('LEAD', 'ASSISTANT', 'MAKER', 'CHECKER');
CREATE TYPE "BatchInstructorStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "batch_course_instructors" (
  "id" TEXT NOT NULL,
  "batchCourseId" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "role" "BatchInstructorRole" NOT NULL DEFAULT 'ASSISTANT',
  "status" "BatchInstructorStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batch_course_instructors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "batch_course_instructors_batchCourseId_instructorId_role_key"
  ON "batch_course_instructors"("batchCourseId", "instructorId", "role");
CREATE INDEX "batch_course_instructors_instructorId_status_idx"
  ON "batch_course_instructors"("instructorId", "status");
CREATE INDEX "batch_course_instructors_batchCourseId_status_role_idx"
  ON "batch_course_instructors"("batchCourseId", "status", "role");

ALTER TABLE "batch_course_instructors"
  ADD CONSTRAINT "batch_course_instructors_batchCourseId_fkey"
  FOREIGN KEY ("batchCourseId") REFERENCES "batch_courses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_course_instructors"
  ADD CONSTRAINT "batch_course_instructors_instructorId_fkey"
  FOREIGN KEY ("instructorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "live_classes"
  ADD COLUMN "batchId" TEXT,
  ADD COLUMN "batchCourseId" TEXT;

CREATE INDEX "live_classes_batchId_idx" ON "live_classes"("batchId");
CREATE INDEX "live_classes_batchCourseId_idx" ON "live_classes"("batchCourseId");

ALTER TABLE "live_classes"
  ADD CONSTRAINT "live_classes_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "batches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "live_classes"
  ADD CONSTRAINT "live_classes_batchCourseId_fkey"
  FOREIGN KEY ("batchCourseId") REFERENCES "batch_courses"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve existing classes when their free-text batch matches a cohort name or code.
UPDATE "live_classes" AS lc
SET
  "batchId" = b."id",
  "batchCourseId" = bc."id",
  "batchName" = b."name"
FROM "batches" AS b
JOIN "batch_courses" AS bc ON bc."batchId" = b."id"
WHERE bc."courseId" = lc."courseId"
  AND (
    LOWER(TRIM(lc."batchName")) = LOWER(TRIM(b."name"))
    OR LOWER(TRIM(lc."batchName")) = LOWER(TRIM(b."code"))
  );

-- A matched legacy class implies its existing instructor was the lead teacher.
INSERT INTO "batch_course_instructors" (
  "id", "batchCourseId", "instructorId", "role", "status", "createdAt", "updatedAt"
)
SELECT DISTINCT
  'legacy_bci_' || SUBSTRING(MD5(lc."batchCourseId" || lc."instructorId") FROM 1 FOR 20),
  lc."batchCourseId",
  lc."instructorId",
  'LEAD'::"BatchInstructorRole",
  'ACTIVE'::"BatchInstructorStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "live_classes" AS lc
WHERE lc."batchCourseId" IS NOT NULL
ON CONFLICT ("batchCourseId", "instructorId", "role") DO NOTHING;
