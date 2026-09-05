CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "certificates_issueDate_id_idx" ON "certificates"("issueDate", "id");
CREATE INDEX "certificates_courseId_issueDate_id_idx" ON "certificates"("courseId", "issueDate", "id");
CREATE INDEX "enrollments_courseId_status_userId_idx" ON "enrollments"("courseId", "status", "userId");
CREATE INDEX "certificates_number_search_idx" ON "certificates" USING GIN ("certificateNumber" gin_trgm_ops);
CREATE INDEX "users_name_search_idx" ON "users" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "users_email_search_idx" ON "users" USING GIN ("email" gin_trgm_ops);
CREATE INDEX "courses_title_search_idx" ON "courses" USING GIN ("title" gin_trgm_ops);
