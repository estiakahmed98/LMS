-- Enrich the audit trail so it can answer security questions, not just
-- "what changed".
--
--  * actorLabel/actorRole snapshot who acted, in plain text, so the record
--    stays readable after the user is renamed or deleted.
--  * ipAddress/userAgent record where the request came from — "who deleted
--    this" is only half an answer without "from where".
--  * severity separates security-relevant events (failed logins, permission
--    changes, deletions) from routine content edits.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'AuditSeverity'
  ) THEN
    CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'NOTICE', 'WARNING', 'CRITICAL');
  END IF;
END $$;

ALTER TABLE "audit_logs"
ADD COLUMN IF NOT EXISTS "actorLabel" TEXT,
ADD COLUMN IF NOT EXISTS "actorRole" TEXT,
ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
ADD COLUMN IF NOT EXISTS "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO';

-- Backfill severity for the security-relevant actions already on record, so
-- historical deletions and permission changes are not mislabelled as routine.
UPDATE "audit_logs" SET "severity" = 'WARNING'
WHERE "action" LIKE '%.deleted' OR "action" = 'permissions.updated';

UPDATE "audit_logs" SET "severity" = 'NOTICE'
WHERE "action" LIKE '%.created' OR "action" LIKE '%.updated';

-- Newest-first reads and action/severity filters back the activity log UI.
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_severity_createdAt_idx" ON "audit_logs"("severity", "createdAt");
