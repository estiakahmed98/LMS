-- Event delivery is part of the originating transaction, including bulk writes.
-- Recipient IDs are unique per event. Repeated no-op updates produce no event.
CREATE INDEX IF NOT EXISTS notifications_inbox_idx ON notifications ("userId", "createdAt" DESC, id DESC);

CREATE FUNCTION deliver_course_notification(
  event_key text, course_id text, event_title text, event_message text,
  audience text, subject_id text DEFAULT NULL, staff_ids text[] DEFAULT ARRAY[]::text[],
  permission_module text DEFAULT 'COURSES', learner_path text DEFAULT NULL,
  staff_path text DEFAULT NULL, target_batch text DEFAULT NULL, target_learner text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notifications (id, "userId", title, message, type, "actionUrl", "createdAt")
  SELECT 'evt_' || md5(event_key || ':' || u.id), u.id, event_title, event_message,
    'INFO'::"NotificationType",
    CASE WHEN u.role = 'STUDENT' THEN learner_path
         WHEN u.role = 'INSTRUCTOR' THEN CASE WHEN staff_path IS NOT NULL THEN '/instructor' || staff_path END
         ELSE CASE WHEN staff_path IS NOT NULL THEN '/admin' || staff_path END END,
    CURRENT_TIMESTAMP
  FROM users u
  WHERE u.status IN ('ACTIVE', 'APPROVED') AND (
    u.role = 'SUPER_ADMIN'
    OR (u.role IN ('COURSE_MANAGER', 'EXAMINER', 'REPORT_VIEWER') AND EXISTS (
      SELECT 1 FROM role_permissions p WHERE p.role = u.role AND p.module::text = permission_module AND p."canView"
    ))
    OR u.id = subject_id
    OR u.id = ANY(staff_ids)
    OR (u.role = 'INSTRUCTOR' AND (
      EXISTS (SELECT 1 FROM enrollments e WHERE e."courseId" = course_id AND e."userId" = u.id AND e.status = 'APPROVED')
      OR EXISTS (SELECT 1 FROM live_classes c WHERE c."courseId" = course_id AND c."instructorId" = u.id)
      OR EXISTS (SELECT 1 FROM batch_course_instructors i JOIN batch_courses bc ON bc.id = i."batchCourseId"
        WHERE bc."courseId" = course_id AND bc.status = 'ACTIVE' AND i.status = 'ACTIVE' AND i."instructorId" = u.id)
    ))
    OR (audience = 'course' AND u.role = 'STUDENT' AND EXISTS (
      SELECT 1 FROM enrollments e WHERE e."courseId" = course_id AND e."userId" = u.id AND e.status = 'APPROVED'
    ) AND (target_learner IS NULL OR u.id = target_learner)
      AND (target_batch IS NULL OR EXISTS (SELECT 1 FROM batch_memberships bm WHERE bm."batchId" = target_batch AND bm."userId" = u.id AND bm.status = 'ACTIVE')))
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

CREATE FUNCTION notify_learning_activity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  n jsonb := to_jsonb(NEW);
  o jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  cid text := n->>'courseId';
  label text := n->>'title';
  course_title text;
  person text;
  event_title text;
  audience text := 'course';
  subject_id text;
  staff_ids text[] := ARRAY[]::text[];
  permission_module text := 'COURSES';
  learner_path text;
  staff_path text;
  target_batch text;
  target_learner text;
  event_key text := TG_TABLE_NAME || ':' || (n->>'id') || ':' || txid_current()::text;
BEGIN
  CASE TG_TABLE_NAME
  WHEN 'enrollments' THEN
    IF TG_OP = 'UPDATE' AND n->>'status' IS NOT DISTINCT FROM o->>'status' THEN RETURN NEW; END IF;
    event_title := CASE WHEN n->>'status' = 'APPROVED' THEN 'Enrollment approved' WHEN n->>'status' = 'PENDING' THEN 'Enrollment requested' ELSE 'Enrollment updated' END;
    audience := 'staff'; subject_id := n->>'userId';
    SELECT name INTO person FROM users WHERE id = subject_id;
    label := person || ' — ' || lower(n->>'status');
  WHEN 'modules' THEN
    IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
    event_title := 'New module added';
  WHEN 'assessments' THEN
    IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
    -- Learners are notified on publication; an empty builder draft is staff-only.
    event_title := 'Assessment created'; audience := 'staff'; permission_module := 'ASSESSMENTS'; staff_path := '/assessments';
  WHEN 'assessment_assignments' THEN
    IF n->>'status' <> 'PUBLISHED' OR (TG_OP = 'UPDATE' AND o->>'status' = 'PUBLISHED') THEN RETURN NEW; END IF;
    SELECT "courseId", title INTO cid, label FROM assessments WHERE id = n->>'assessmentId';
    event_title := 'Assessment published'; permission_module := 'ASSESSMENTS';
    learner_path := '/assessments/' || (n->>'assessmentId'); staff_path := '/assessments';
    target_batch := n->>'batchId'; target_learner := n->>'learnerId';
  WHEN 'live_classes' THEN
    IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
    event_title := 'New live class scheduled'; staff_ids := ARRAY[n->>'instructorId'];
    learner_path := '/live-classes'; staff_path := '/classes';
  WHEN 'live_class_sessions' THEN
    SELECT "courseId", title, ARRAY["instructorId"] INTO cid, label, staff_ids FROM live_classes WHERE id = n->>'liveClassId';
    learner_path := '/live-classes'; staff_path := '/classes';
    IF (NULLIF(n->>'recordingUrl', '') IS NOT NULL OR NULLIF(n->>'youtubeUrl', '') IS NOT NULL)
       AND ((n->>'recordingUrl') IS DISTINCT FROM (o->>'recordingUrl') OR (n->>'youtubeUrl') IS DISTINCT FROM (o->>'youtubeUrl')) THEN
      event_title := 'Recording updated'; staff_path := '/recordings';
    ELSIF TG_OP = 'UPDATE' AND n->>'status' IS DISTINCT FROM o->>'status' THEN
      event_title := CASE WHEN n->>'status' = 'LIVE' THEN 'Live class started' WHEN n->>'status' = 'CANCELLED' THEN 'Live class cancelled' ELSE 'Live class updated' END;
    ELSIF TG_OP = 'INSERT' OR n->>'scheduledStart' IS DISTINCT FROM o->>'scheduledStart' OR n->>'scheduledEnd' IS DISTINCT FROM o->>'scheduledEnd' THEN
      event_title := CASE WHEN TG_OP = 'INSERT' THEN 'Live session scheduled' ELSE 'Live class rescheduled' END;
      label := label || ' — ' || (n->>'scheduledStart');
    ELSE RETURN NEW;
    END IF;
  WHEN 'certificates' THEN
    IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
    event_title := 'Certificate generated'; audience := 'staff'; subject_id := n->>'userId'; permission_module := 'CERTIFICATES';
    SELECT name INTO person FROM users WHERE id = subject_id;
    label := person || ' — ' || (n->>'certificateNumber'); learner_path := '/certificates'; staff_path := '/certificates';
  WHEN 'submissions' THEN
    SELECT "courseId", title INTO cid, label FROM assessments WHERE id = n->>'assessmentId';
    SELECT name INTO person FROM users WHERE id = n->>'userId';
    label := person || ' — ' || label;
    audience := 'staff'; permission_module := 'SUBMISSIONS'; staff_path := '/submissions';
    staff_ids := array_remove(ARRAY[n->>'makerId', n->>'checkerId'], NULL);
    IF n->>'submittedAt' IS NOT NULL AND o->>'submittedAt' IS NULL THEN
      SELECT title INTO course_title FROM courses WHERE id = cid;
      PERFORM deliver_course_notification(event_key || ':submitted', cid, 'Assessment submitted', label || ' · ' || course_title,
        'staff', NULL, staff_ids, permission_module, NULL, staff_path);
    END IF;
    IF n->>'status' IN ('GRADED', 'REVIEWED') AND n->>'manualReviewStatus' IN ('NOT_REQUIRED', 'FINALIZED')
       AND (n->>'status' IS DISTINCT FROM o->>'status' OR n->>'manualReviewStatus' IS DISTINCT FROM o->>'manualReviewStatus' OR n->>'obtainedMarks' IS DISTINCT FROM o->>'obtainedMarks') THEN
      event_title := 'Assessment result published'; subject_id := n->>'userId'; learner_path := '/assessments/' || (n->>'assessmentId') || '/result';
    ELSIF n->>'manualReviewStatus' IN ('PENDING_CHECKER', 'RETURNED_TO_MAKER') AND n->>'manualReviewStatus' IS DISTINCT FROM o->>'manualReviewStatus' THEN
      event_title := CASE WHEN n->>'manualReviewStatus' = 'PENDING_CHECKER' THEN 'Submission ready for checking' ELSE 'Submission returned to maker' END;
    ELSIF (n->>'makerId' IS DISTINCT FROM o->>'makerId' OR n->>'checkerId' IS DISTINCT FROM o->>'checkerId') AND cardinality(staff_ids) > 0 THEN
      event_title := 'Grading assignment updated';
    ELSE RETURN NEW;
    END IF;
  ELSE RETURN NEW;
  END CASE;
  SELECT title INTO course_title FROM courses WHERE id = cid;
  IF cid IS NULL OR course_title IS NULL THEN RETURN NEW; END IF;
  IF learner_path IS NULL AND audience = 'course' THEN learner_path := '/courses/' || cid; END IF;
  IF learner_path IS NULL AND TG_TABLE_NAME = 'enrollments' THEN learner_path := '/courses'; END IF;
  IF staff_path IS NULL THEN staff_path := '/courses/' || cid; END IF;
  PERFORM deliver_course_notification(event_key || ':' || event_title, cid, event_title,
    COALESCE(label || ' · ', '') || course_title, audience, subject_id, staff_ids,
    permission_module, learner_path, staff_path, target_batch, target_learner);
  RETURN NEW;
END;
$$;

CREATE TRIGGER enrollment_notification AFTER INSERT OR UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION notify_learning_activity();
CREATE TRIGGER module_notification AFTER INSERT ON modules FOR EACH ROW EXECUTE FUNCTION notify_learning_activity();
CREATE TRIGGER assessment_notification AFTER INSERT ON assessments FOR EACH ROW EXECUTE FUNCTION notify_learning_activity();
CREATE TRIGGER assessment_publication_notification AFTER INSERT OR UPDATE ON assessment_assignments FOR EACH ROW EXECUTE FUNCTION notify_learning_activity();
CREATE TRIGGER live_class_notification AFTER INSERT ON live_classes FOR EACH ROW EXECUTE FUNCTION notify_learning_activity();
CREATE TRIGGER live_session_notification AFTER INSERT OR UPDATE ON live_class_sessions FOR EACH ROW EXECUTE FUNCTION notify_learning_activity();
CREATE TRIGGER certificate_notification AFTER INSERT ON certificates FOR EACH ROW EXECUTE FUNCTION notify_learning_activity();
CREATE TRIGGER submission_notification AFTER INSERT OR UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION notify_learning_activity();
