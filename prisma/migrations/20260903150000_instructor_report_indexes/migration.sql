CREATE INDEX IF NOT EXISTS "enrollments_courseId_status_enrolledAt_idx"
ON "enrollments"("courseId", "status", "enrolledAt" DESC);

CREATE INDEX IF NOT EXISTS "assessments_courseId_createdAt_idx"
ON "assessments"("courseId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "submissions_submittedAt_id_idx"
ON "submissions"("submittedAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "certificates_courseId_issueDate_idx"
ON "certificates"("courseId", "issueDate" DESC);
