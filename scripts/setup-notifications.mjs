import 'dotenv/config';
import pg from 'pg';
import { installNotificationDatabase, inspectNotificationDatabase } from './notification-database.mjs';

const checkOnly = process.argv.includes('--check');
let client;
try {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL (or DIRECT_URL) is required.');
  const schema = new URL(connectionString).searchParams.get('schema') || 'public';
  client = new pg.Client({ connectionString, connectionTimeoutMillis: 15_000 });
  await client.connect();
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout = '15s'");
  await client.query("SET LOCAL statement_timeout = '60s'");
  if (checkOnly) {
    const status = await inspectNotificationDatabase(client, schema);
    if (!status.ready) throw new Error(`Missing or disabled notification infrastructure: ${status.missing.join(', ')}. Run npm run db:notifications.`);
    console.log('Notification database: all 8 event triggers and both functions are enabled.');
  } else {
    const changed = await installNotificationDatabase(client, schema);
    console.log(changed ? 'Notification database: installed and verified all 8 event triggers.' : 'Notification database: already installed and verified.');
  }
  await client.query('COMMIT');
} catch (error) {
  if (client) await client.query('ROLLBACK').catch(() => {});
  // Do not print connection objects, URLs or credentials in deployment logs.
  console.error('Notification database setup failed.', error?.code ? `Database error ${error.code}. Verify connectivity, schema and DDL permissions; initialize tables before running db:notifications.` : error instanceof TypeError ? 'Check the database URL format.' : error.message);
  process.exitCode = 1;
} finally {
  if (client) await client.end();
}
