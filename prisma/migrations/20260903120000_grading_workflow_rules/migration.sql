CREATE TABLE IF NOT EXISTS "grading_workflow_rules" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "courseId" TEXT,
  "batchId" TEXT,
  "studentId" TEXT,
  "makerId" TEXT,
  "requiresChecker" BOOLEAN NOT NULL DEFAULT true,
  "checkerId" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "grading_workflow_rules_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "batchId" TEXT;
ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "makerId" TEXT;
ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "requiresChecker" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "checkerId" TEXT;
ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "grading_workflow_rules" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "grading_workflow_rules_active_priority_idx" ON "grading_workflow_rules"("active", "priority");
CREATE INDEX IF NOT EXISTS "grading_workflow_rules_courseId_idx" ON "grading_workflow_rules"("courseId");
CREATE INDEX IF NOT EXISTS "grading_workflow_rules_batchId_idx" ON "grading_workflow_rules"("batchId");
CREATE INDEX IF NOT EXISTS "grading_workflow_rules_studentId_idx" ON "grading_workflow_rules"("studentId");
CREATE INDEX IF NOT EXISTS "grading_workflow_rules_makerId_idx" ON "grading_workflow_rules"("makerId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grading_workflow_rules_courseId_fkey') THEN ALTER TABLE "grading_workflow_rules" ADD CONSTRAINT "grading_workflow_rules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grading_workflow_rules_batchId_fkey') THEN ALTER TABLE "grading_workflow_rules" ADD CONSTRAINT "grading_workflow_rules_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grading_workflow_rules_studentId_fkey') THEN ALTER TABLE "grading_workflow_rules" ADD CONSTRAINT "grading_workflow_rules_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grading_workflow_rules_makerId_fkey') THEN ALTER TABLE "grading_workflow_rules" ADD CONSTRAINT "grading_workflow_rules_makerId_fkey" FOREIGN KEY ("makerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grading_workflow_rules_checkerId_fkey') THEN ALTER TABLE "grading_workflow_rules" ADD CONSTRAINT "grading_workflow_rules_checkerId_fkey" FOREIGN KEY ("checkerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grading_workflow_rules_createdById_fkey') THEN ALTER TABLE "grading_workflow_rules" ADD CONSTRAINT "grading_workflow_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
END $$;
