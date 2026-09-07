# Notifications and announcements

`/admin/notifications` has separate Announcement (existing campaign composer and delivery reports) and Notification (personal inbox) tabs. Personal inboxes are also available at `/notifications` and `/instructor/notifications`. All portals expose the inbox through the sidebar and top bar. The bell polls every 60 seconds; read operations refresh its count immediately. Clicking a bell item opens its full message in the inbox; a separate action opens the relevant portal page.

## Delivery policy

| Event | Recipients |
| --- | --- |
| Enrollment requested / status changed | Learner, course instructors, eligible administrators |
| Module added | Approved course learners, course instructors, eligible administrators |
| Assessment created | Course instructors and eligible administrators |
| Assessment published | Approved learners in its course/batch/individual assignment, course instructors, eligible administrators |
| Live class/session scheduled, rescheduled or status changed | Approved course learners, course instructors, eligible administrators |
| Recording URL added or changed | Approved course learners, course instructors, eligible administrators |
| Assessment submitted / sent to checker / returned to maker | Course instructors, assigned maker/checker, eligible administrators |
| Result finalized (including automatic MCQ grading) | Submitting learner, course instructors, assigned maker/checker, eligible administrators |
| Certificate issued | Certificate holder, course instructors, eligible administrators |

Recipients must have ACTIVE or APPROVED accounts. Course instructors include approved instructor enrollments, live-class instructors and active batch-course instructor assignments (including maker/checker roles). Super admins receive all events; other admin roles need view permission for the event's module. Learner result notifications are withheld until finalization. Assessment creation is staff-only because the builder can still be incomplete; publication notifies the assigned learners.

## Implementation and operations

Migration `20260907120000_activity_notifications` installs PostgreSQL triggers and an inbox index. Event delivery happens in the same transaction as the business operation, covering API, bulk, cohort and recording-worker writes. Transaction rollback also rolls back notifications. No-op status/URL updates do not notify; deterministic per-transaction event/recipient IDs prevent duplicate delivery. This deliberately adds delivery work to writes: a notification failure rolls back the originating operation, and large fan-outs should be monitored before introducing a durable outbox worker.

Existing campaign notifications remain identifiable by `campaignId`. The personal API `/api/notifications` authenticates against the current account and scopes all list, detail and read queries to that recipient. Announcement management retains its existing SETTINGS permissions. Following an activity link still passes through the destination's authorization checks.

Run `npx prisma migrate deploy` in each target environment. Historical actions are not backfilled. Downloading an already issued certificate is not a new issuance event. Upcoming instructor reminders retain their existing polling behavior.

Validation: `node scripts/test-notification-events.mjs` runs the migration and event scenarios in an isolated schema inside a rolled-back transaction. It requires the project's PostgreSQL connection, never copies production rows, and checks recipient isolation, draft/publication behavior, grading confidentiality, duplicates and rollback. API ownership and safe-link tests run with Vitest.
