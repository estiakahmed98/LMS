ALTER TYPE "NotificationAudienceType" ADD VALUE 'ALL_ACTIVE_INSTRUCTORS';
ALTER TYPE "NotificationAudienceType" ADD VALUE 'COURSE_INSTRUCTORS';
ALTER TYPE "NotificationAudienceType" ADD VALUE 'SPECIFIC_INSTRUCTOR';

ALTER TABLE "notification_campaigns"
  ADD COLUMN "targetInstructorId" TEXT;

CREATE INDEX "notification_campaigns_targetInstructorId_idx"
  ON "notification_campaigns"("targetInstructorId");

ALTER TABLE "notification_campaigns"
  ADD CONSTRAINT "notification_campaigns_targetInstructorId_fkey"
  FOREIGN KEY ("targetInstructorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
