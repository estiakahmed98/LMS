-- Stable cursor pagination for learner live-class history. The id tie-breaker
-- keeps ordering deterministic when many sessions share the same start time.
CREATE INDEX IF NOT EXISTS "live_class_sessions_scheduledStart_id_idx"
ON "live_class_sessions"("scheduledStart", "id");
