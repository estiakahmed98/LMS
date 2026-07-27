-- Time-based module unlocking.
--
-- openedAt records when a learner first opened a module; the unlock delay is
-- measured from it against the server clock, so a dropped connection or a
-- closed browser never costs the learner time they already spent.
--
-- quizPassed separates "the wait was served" from "the quiz was passed", so a
-- module carrying a quiz is not treated as complete until both are true.
--
-- IF NOT EXISTS because earlier iterations of this change were pushed to some
-- databases directly; this keeps the migration safe to run against those too.
ALTER TABLE "video_progress"
ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "quizPassed" BOOLEAN NOT NULL DEFAULT false;
