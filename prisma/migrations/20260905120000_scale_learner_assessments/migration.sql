-- These indexes support learner-scoped visibility and assessment history queries.
CREATE INDEX "assessments_courseId_type_createdAt_id_idx" ON "assessments"("courseId", "type", "createdAt", "id");
CREATE INDEX "enrollments_userId_status_courseId_idx" ON "enrollments"("userId", "status", "courseId");
CREATE INDEX "batch_memberships_userId_status_batchId_idx" ON "batch_memberships"("userId", "status", "batchId");
