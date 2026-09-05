# Admin certificate management

The history endpoint returns only 25, 50 or 100 certificate summaries per request. Filters cover certificate number, learner name/email, course (including archived courses), validity and Bangladesh issue-date ranges. Search is debounced; aborted requests cannot overwrite a newer result. `(issueDate, id)` keyset pagination supports deep history without an OFFSET scan. Counts share a database snapshot with the returned page and reflect all matching records, not the page size.

Course option searches are bounded to 30 plus one lookahead. Template loading and editing are independent of history refreshes, so filtering and issuance do not overwrite unsaved template changes. Mobile history uses stacked rows. Existing export, revoke, reissue, signature/seal upload and template save permission checks remain in place. Previously reissued certificates do not offer the reissue action again.

Bulk issuance:

- Each POST creates at most 100 certificates in a 15-second transaction.
- A continuation user ID avoids rescanning already processed learner IDs between batches.
- The UI sends one batch at a time, reports progress and can pause after the in-flight batch commits. Navigating away stops subsequent requests. This is not a durable background job; reopen and run again to resume.
- Every retained certificate, including revoked certificates, is excluded from bulk issuance. Course-level PostgreSQL transaction locks prevent concurrent bulk requests from creating duplicates. Re-running after an uncertain network response safely skips committed certificates.
- Eligibility preserves existing rules: COMPLETED means progress >= 100 or completedAt is set; PASS means at least one graded/reviewed assessment in that course reaches its passing mark. This does not mean passing every assessment.
- Certificate numbering still uses the atomic issuer/year sequence. Each batch retains the existing audit event.

Migration `20260905160000_scale_admin_certificates` adds history/eligibility B-tree indexes and `pg_trgm` GIN indexes for certificate numbers, learner names/emails and course titles. Deployment requires permission to install pg_trgm. On a busy production database, schedule index creation or prepare equivalent concurrent indexes through a reviewed operational migration; the supplied migration uses standard CREATE INDEX.

Validation:

- `npx vitest run lib/admin-certificate-list.test.ts`
- `npx tsx scripts/check-admin-certificates.ts` checks real PostgreSQL pagination, search escaping, timestamps, old courses, bulk bounds, retries, cross-connection locking, and eligibility. Fixtures always roll back.
- `npx tsx scripts/check-admin-certificates.ts --scale` additionally creates 100,000 temporary users and certificates spanning ten years and measures sequential list/filter requests. It is a local dataset check, not a production concurrency or p95 capacity guarantee.
- `npx tsc --noEmit`, targeted ESLint, and `npm run build`.

Exact counts still inspect matching history. Production capacity depends on data distribution, database resources, concurrent requests, index maintenance and pool saturation. A multi-user load test is needed before claiming support for 100,000 simultaneous users.

Local measurement (2026-09-05): 100,000 users and 100,000 certificates spanning ten years; 25 rows per request. Final query timings were history 106 ms, valid 107 ms, revoked 103 ms, learner search 150 ms, and a one-year date range 10 ms. These are individual sequential measurements against the local database, not percentiles or concurrent load results. All fixtures were rolled back; optimizer statistics were refreshed after fixture cleanup.
