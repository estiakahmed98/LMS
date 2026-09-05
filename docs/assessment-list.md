# Learner assessment listing

The learner endpoint uses server-side filtering and `(createdAt, id)` keyset pagination, with page sizes of 12, 24, or 48. Counts and rows share one SQL statement and snapshot. Only the current page is returned; questions, answer sheets, and grading reviews are not loaded. Previous pages use a client cursor stack, independently for each assessment type.

Visibility requires approved course enrollment and either a published eligible assignment or the learner's own submission. Batch assignments require active membership and an active, unexpired batch. Scheduled batch starts are included in upcoming availability. Current assignments take precedence over future assignments, then individual > batch > course and latest update, consistent with the attempt access policy. Upcoming cards cannot launch an attempt; existing detail and submit authorization is retained.

Completed means the latest attempt has a published score (GRADED or REVIEWED). Pending review means the latest attempt was submitted but is not scored. Otherwise assignments are upcoming, available, or closed. A completed assessment can still have retakes; use its result page. Date filters include both chosen Bangladesh calendar dates and use the effective opening date, falling back to assessment creation. Type counts use the displayed filters; status counts additionally use the selected type.

There is no separate Group entity in the current schema. Batch / group uses BatchMembership. The batch filter selects published assignments to that membership; Assigned through filters the effective assignment target. Filter options contain only the learner's approved courses and active memberships.

Validation:

- `npx vitest run lib/assessment-list.test.ts lib/assessment-access.test.ts`
- `npx tsx scripts/check-assessment-list.ts` runs PostgreSQL integration fixtures in a transaction that always rolls back.
- `npx tsc --noEmit`

Deploy the migration using `npx prisma migrate deploy`. It adds learner enrollment, membership, and course assessment indexes. Existing assignment and submission indexes support lateral lookups. Exact counts still inspect matching learner history; they are not constant-time. This implementation does not establish capacity for 100,000 users or concurrent sessions. Validate production-like history, concurrency, p95 latency, query plans, and database pool saturation before making that capacity claim.
