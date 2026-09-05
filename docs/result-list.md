# Learner result history

`/results` uses independent MCQ, Written, Practical, and Mixed filters and cursor histories. Each row represents one submitted attempt, and its detail link includes the exact submission ID. Drafts are excluded. Status tabs are All attempts, Completed, Passed, Failed, and Pending review. Completed combines Passed and Failed. A score is shown only for GRADED/REVIEWED submissions with non-null marks; zero is a valid published score.

Filtering and counts run in PostgreSQL in one statement/snapshot. Lists are bounded to 12, 24, or 48 rows plus one lookahead, ordered by immutable attempt creation time and ID. Questions, answer sheets, and review payloads are not loaded. Date ranges use submittedAt in Bangladesh time with an exclusive next-day upper boundary. Rows without a submission timestamp appear without date filters but do not match a date range.

Visibility preserves approved course enrollment and learner ownership. Course options are approved enrollments. Batch/group options include retained past memberships for historical lookup. Assignment scope and batch filters use retained non-draft assignments. There is no assignment snapshot on Submission, so these filters describe retained associations, not guaranteed assignment provenance at submission time. Removed assignments cannot be reconstructed. Filtering does not grant access or modify attempt authorization.

The migration adds user/creation-time/ID and user/submission-time/ID indexes. Exact counts still inspect the learner's matching history. No 100,000-user capacity claim has been established; production-like load testing is required to establish concurrency and latency limits.

Checks:

- `npx vitest run lib/result-list.test.ts lib/assessment-list.test.ts lib/assessment-access.test.ts`
- `npx tsx scripts/check-result-list.ts` uses real PostgreSQL fixtures that always roll back.
- `npx tsc --noEmit`
- `npm run build`

Deploy indexes with `npx prisma migrate deploy`.
