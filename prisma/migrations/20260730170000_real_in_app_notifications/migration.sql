-- Persist admin-created in-app campaigns while retaining one notification row
-- per recipient for independent read/unread state.
CREATE TYPE "NotificationAudienceType" AS ENUM (
  'ALL_ACTIVE_STUDENTS',
  'COURSE_STUDENTS',
  'ASSESSMENT_PENDING_STUDENTS'
);

CREATE TABLE "notification_campaigns" (
  "id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'INFO',
  "audienceType" "NotificationAudienceType" NOT NULL,
  "courseId" TEXT,
  "assessmentId" TEXT,
  "actionUrl" TEXT,
  "recipientCount" INTEGER NOT NULL,
  "createdById" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notifications"
  ADD COLUMN "campaignId" TEXT,
  ADD COLUMN "actionUrl" TEXT;

CREATE INDEX "notification_campaigns_sentAt_idx"
  ON "notification_campaigns"("sentAt");
CREATE INDEX "notification_campaigns_audienceType_idx"
  ON "notification_campaigns"("audienceType");
CREATE INDEX "notification_campaigns_courseId_idx"
  ON "notification_campaigns"("courseId");
CREATE INDEX "notification_campaigns_assessmentId_idx"
  ON "notification_campaigns"("assessmentId");
CREATE INDEX "notifications_campaignId_readAt_idx"
  ON "notifications"("campaignId", "readAt");
CREATE UNIQUE INDEX "notifications_campaignId_userId_key"
  ON "notifications"("campaignId", "userId");

ALTER TABLE "notification_campaigns"
  ADD CONSTRAINT "notification_campaigns_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "courses"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_campaigns"
  ADD CONSTRAINT "notification_campaigns_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_campaigns"
  ADD CONSTRAINT "notification_campaigns_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "notification_campaigns"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
