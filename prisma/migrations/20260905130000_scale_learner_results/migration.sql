CREATE INDEX "submissions_userId_createdAt_id_idx" ON "submissions"("userId", "createdAt", "id");
CREATE INDEX "submissions_userId_submittedAt_id_idx" ON "submissions"("userId", "submittedAt", "id");
