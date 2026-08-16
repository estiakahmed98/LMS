ALTER TYPE "BatchStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'ACTIVE';
ALTER TYPE "BatchStatus" ADD VALUE IF NOT EXISTS 'COMPLETED' AFTER 'ACTIVE';

CREATE TYPE "BatchMembershipStatus" AS ENUM ('ACTIVE', 'WITHDRAWN');
CREATE TYPE "BatchCourseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "BatchEnrollmentStatus" AS ENUM ('ACTIVE', 'WITHDRAWN');

ALTER TABLE "batches"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "capacity" INTEGER,
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka';

UPDATE "batches"
SET "code" = 'LEGACY-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 10))
WHERE "code" IS NULL;

ALTER TABLE "batches"
  ALTER COLUMN "code" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE UNIQUE INDEX "batches_code_key" ON "batches"("code");

ALTER TABLE "batch_memberships"
  ADD COLUMN "status" "BatchMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "leftAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "enrollments"
  ADD COLUMN "directAssignment" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "batch_courses" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "status" "BatchCourseStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batch_courses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "batch_courses_batchId_courseId_key"
  ON "batch_courses"("batchId", "courseId");
CREATE INDEX "batch_courses_courseId_status_idx"
  ON "batch_courses"("courseId", "status");

ALTER TABLE "batch_courses"
  ADD CONSTRAINT "batch_courses_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "batches"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_courses"
  ADD CONSTRAINT "batch_courses_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "courses"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "batch_courses" (
  "id", "batchId", "courseId", "status", "createdAt", "updatedAt"
)
SELECT
  'legacy_bc_' || "id", "id", "courseId", 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "batches"
WHERE "courseId" IS NOT NULL
ON CONFLICT ("batchId", "courseId") DO NOTHING;

CREATE TABLE "batch_enrollments" (
  "id" TEXT NOT NULL,
  "batchMembershipId" TEXT NOT NULL,
  "batchCourseId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "status" "BatchEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batch_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "batch_enrollments_batchMembershipId_batchCourseId_key"
  ON "batch_enrollments"("batchMembershipId", "batchCourseId");
CREATE INDEX "batch_enrollments_enrollmentId_status_idx"
  ON "batch_enrollments"("enrollmentId", "status");
CREATE INDEX "batch_enrollments_batchCourseId_status_idx"
  ON "batch_enrollments"("batchCourseId", "status");

ALTER TABLE "batch_enrollments"
  ADD CONSTRAINT "batch_enrollments_batchMembershipId_fkey"
  FOREIGN KEY ("batchMembershipId") REFERENCES "batch_memberships"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_enrollments"
  ADD CONSTRAINT "batch_enrollments_batchCourseId_fkey"
  FOREIGN KEY ("batchCourseId") REFERENCES "batch_courses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_enrollments"
  ADD CONSTRAINT "batch_enrollments_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "batch_enrollments" (
  "id", "batchMembershipId", "batchCourseId", "enrollmentId", "status",
  "createdAt", "updatedAt"
)
SELECT
  'legacy_be_' || SUBSTRING(MD5(bm."id" || bc."id") FROM 1 FOR 20),
  bm."id", bc."id", e."id", 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "batch_memberships" bm
JOIN "batch_courses" bc ON bc."batchId" = bm."batchId"
JOIN "enrollments" e
  ON e."userId" = bm."userId" AND e."courseId" = bc."courseId"
ON CONFLICT ("batchMembershipId", "batchCourseId") DO NOTHING;
