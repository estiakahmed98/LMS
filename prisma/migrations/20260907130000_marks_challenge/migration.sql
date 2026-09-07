ALTER TABLE "submissions"
ADD COLUMN "marksChallengeStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "marksChallengeRequestedAt" TIMESTAMP(3),
ADD COLUMN "marksChallengeApprovedAt" TIMESTAMP(3),
ADD COLUMN "marksChallengeResolvedAt" TIMESTAMP(3);

CREATE INDEX "submissions_marksChallengeStatus_updatedAt_idx"
ON "submissions"("marksChallengeStatus", "updatedAt");
