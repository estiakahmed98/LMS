// Runs the actual migration in an isolated PostgreSQL schema, always rolled back.
import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query('BEGIN');
  await db.query('CREATE SCHEMA notification_event_test');
  await db.query('SET LOCAL search_path TO notification_event_test, public');
  // Clone production columns/types/defaults without copying data or triggers.
  for (const table of ['users', 'courses', 'role_permissions', 'enrollments', 'batch_memberships', 'batch_courses', 'batch_course_instructors', 'live_classes', 'live_class_sessions', 'modules', 'assessments', 'assessment_assignments', 'certificates', 'submissions', 'notifications']) {
    await db.query(`CREATE TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS)`);
    // Keep fixtures focused on event fields; production types are still checked.
    const columns = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'notification_event_test' AND table_name = $1 AND is_nullable = 'NO'`, [table]);
    for (const row of columns.rows) await db.query(`ALTER TABLE ${table} ALTER COLUMN "${row.column_name}" DROP NOT NULL`);
  }
  await db.query('ALTER TABLE notifications ADD PRIMARY KEY (id)');
  await db.query(await readFile(new URL('../prisma/migrations/20260907120000_activity_notifications/migration.sql', import.meta.url), 'utf8'));
  await db.query(`INSERT INTO users (id, name, role, status) VALUES
    ('admin','Admin','SUPER_ADMIN','ACTIVE'), ('teacher','Teacher','INSTRUCTOR','ACTIVE'),
    ('maker','Maker','INSTRUCTOR','ACTIVE'), ('checker','Checker','EXAMINER','ACTIVE'),
    ('student','Student','STUDENT','ACTIVE'), ('peer','Peer','STUDENT','ACTIVE'),
    ('outsider','Outsider','STUDENT','ACTIVE'), ('suspended','Suspended','STUDENT','SUSPENDED');
    INSERT INTO courses (id, title) VALUES ('course','Course');
    INSERT INTO batch_courses (id,"courseId",status) VALUES ('bc','course','ACTIVE');
    INSERT INTO batch_course_instructors (id,"batchCourseId","instructorId",status) VALUES ('bi','bc','teacher','ACTIVE');
    INSERT INTO enrollments (id,"userId","courseId",status) VALUES ('e1','student','course','APPROVED'),('e2','peer','course','APPROVED'),('e3','suspended','course','APPROVED');`);
  const recipients = async title => (await db.query('SELECT "userId" FROM notifications WHERE title = $1 ORDER BY "userId"', [title])).rows.map(row => row.userId);
  assert.deepEqual(await recipients('Enrollment approved'), ['admin','admin','admin','peer','student','teacher','teacher','teacher']);
  await db.query('DELETE FROM notifications');
  await db.query(`INSERT INTO modules (id,"courseId",title) VALUES ('m','course','Module')`);
  assert.deepEqual(await recipients('New module added'), ['admin','peer','student','teacher']);
  await db.query(`UPDATE enrollments SET progress = 20 WHERE id = 'e1'`);
  assert.equal((await recipients('Enrollment approved')).length, 0);
  await db.query(`INSERT INTO assessments (id,"courseId",title) VALUES ('a','course','Exam')`);
  assert.deepEqual(await recipients('Assessment created'), ['admin','teacher']);
  await db.query(`INSERT INTO assessment_assignments (id,"assessmentId","targetType","learnerId",status) VALUES ('aa','a','LEARNER','student','DRAFT')`);
  assert.deepEqual(await recipients('Assessment published'), []);
  await db.query(`UPDATE assessment_assignments SET status = 'PUBLISHED' WHERE id = 'aa'`);
  assert.deepEqual(await recipients('Assessment published'), ['admin','student','teacher']);
  await db.query(`UPDATE assessment_assignments SET status = 'PUBLISHED' WHERE id = 'aa'`);
  assert.equal((await recipients('Assessment published')).length, 3);
  await db.query(`INSERT INTO submissions (id,"assessmentId","userId",status,"submittedAt","manualReviewStatus","makerId","checkerId") VALUES ('s','a','student','SUBMITTED',now(),'PENDING_MAKER','maker','checker')`);
  assert.deepEqual(await recipients('Assessment submitted'), ['admin','checker','maker','teacher']);
  await db.query(`UPDATE submissions SET "manualReviewStatus" = 'PENDING_CHECKER', status = 'GRADING' WHERE id = 's'`);
  assert.deepEqual(await recipients('Submission ready for checking'), ['admin','checker','maker','teacher']);
  assert.deepEqual(await recipients('Assessment result published'), []);
  await db.query(`UPDATE submissions SET "manualReviewStatus" = 'FINALIZED', status = 'GRADED', "obtainedMarks" = 80 WHERE id = 's'`);
  assert.deepEqual(await recipients('Assessment result published'), ['admin','checker','maker','student','teacher']);
  await db.query(`INSERT INTO live_classes (id,"courseId","instructorId",title) VALUES ('lc','course','teacher','Class');
    INSERT INTO live_class_sessions (id,"liveClassId","scheduledStart", "scheduledEnd") VALUES ('ls','lc',now(),now());
    UPDATE live_class_sessions SET status = 'LIVE' WHERE id = 'ls';
    UPDATE live_class_sessions SET "youtubeUrl" = 'https://youtu.be/example' WHERE id = 'ls';`);
  assert.deepEqual(await recipients('New live class scheduled'), ['admin','peer','student','teacher']);
  assert.deepEqual(await recipients('Live class started'), ['admin','peer','student','teacher']);
  assert.deepEqual(await recipients('Recording updated'), ['admin','peer','student','teacher']);
  await db.query(`INSERT INTO certificates (id,"courseId","userId","certificateNumber") VALUES ('cert','course','student','TEST-001')`);
  assert.deepEqual(await recipients('Certificate generated'), ['admin','student','teacher']);
  await db.query('SAVEPOINT rollback_check');
  await db.query(`INSERT INTO modules (id,"courseId",title) VALUES ('rollback','course','Rollback module')`);
  await db.query('ROLLBACK TO SAVEPOINT rollback_check');
  assert.equal((await db.query(`SELECT count(*)::int AS count FROM notifications WHERE message LIKE 'Rollback module%'`)).rows[0].count, 0);
  assert.equal((await db.query(`SELECT count(*)::int AS count FROM notifications WHERE "userId" IN ('outsider','suspended')`)).rows[0].count, 0);
  console.log('Notification event integration checks passed (recipients, privacy, transitions, deduplication, rollback).');
} finally {
  await db.query('ROLLBACK');
  await db.end();
}
