import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export const notificationTriggers = {
  enrollment_notification: 'enrollments',
  module_notification: 'modules',
  assessment_notification: 'assessments',
  assessment_publication_notification: 'assessment_assignments',
  live_class_notification: 'live_classes',
  live_session_notification: 'live_class_sessions',
  certificate_notification: 'certificates',
  submission_notification: 'submissions',
};

const identifier = value => `"${value.replaceAll('"', '""')}"`;

export async function notificationInstallSql(schema) {
  // Keep the immutable migration as the single source of event/recipient rules.
  const source = await readFile(new URL('../prisma/migrations/20260907120000_activity_notifications/migration.sql', import.meta.url), 'utf8');
  let sql = source.replaceAll('CREATE FUNCTION ', 'CREATE OR REPLACE FUNCTION ')
    .replaceAll('LANGUAGE plpgsql AS $$', () => `LANGUAGE plpgsql SET search_path = ${identifier(schema)}, pg_catalog AS $$`);
  for (const [name, table] of Object.entries(notificationTriggers)) {
    sql = sql.replace(`CREATE TRIGGER ${name} `, `DROP TRIGGER IF EXISTS ${identifier(name)} ON ${identifier(table)};\nCREATE TRIGGER ${name} `);
  }
  const version = createHash('sha256').update(sql).digest('hex');
  return { sql, version };
}

export async function inspectNotificationDatabase(client, schema) {
  const result = await client.query(`
    SELECT t.tgname AS name, c.relname AS table_name, t.tgenabled AS enabled
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace pn ON pn.oid = p.pronamespace
    WHERE n.nspname = $1 AND pn.nspname = $1 AND NOT t.tgisinternal
      AND p.proname = 'notify_learning_activity'`, [schema]);
  const missing = Object.entries(notificationTriggers).filter(([name, table]) => !result.rows.some(row => row.name === name && row.table_name === table && ['O', 'A'].includes(row.enabled))).map(([name]) => name);
  const functions = await client.query(`SELECT p.proname AS name, obj_description(p.oid, 'pg_proc') AS version
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = $1 AND p.proname IN ('deliver_course_notification', 'notify_learning_activity')`, [schema]);
  for (const name of ['deliver_course_notification', 'notify_learning_activity']) {
    if (!functions.rows.some(row => row.name === name)) missing.push(name);
  }
  const { version } = await notificationInstallSql(schema);
  return { ready: missing.length === 0, missing, current: functions.rows.some(row => row.name === 'notify_learning_activity' && row.version === `notification-installer:${version}`) };
}

/** Caller owns the transaction. DDL and verification either all commit or all roll back. */
export async function installNotificationDatabase(client, schema) {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('lms-notifications:' || $1))`, [schema]);
  await client.query(`SELECT set_config('search_path', $1, true)`, [`${identifier(schema)}, pg_catalog`]);
  const status = await inspectNotificationDatabase(client, schema);
  if (status.ready && status.current) return false;
  const { sql, version } = await notificationInstallSql(schema);
  await client.query(sql);
  await client.query(`COMMENT ON FUNCTION ${identifier(schema)}.notify_learning_activity() IS 'notification-installer:${version}'`);
  const verified = await inspectNotificationDatabase(client, schema);
  if (!verified.ready || !verified.current) throw new Error('Notification database verification failed.');
  return true;
}
