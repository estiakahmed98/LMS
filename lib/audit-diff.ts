/**
 * Pure helpers for shaping audit payloads.
 *
 * Deliberately free of Next.js, Prisma, and auth imports so the redaction and
 * diffing rules — the parts with real security consequences — can be unit
 * tested directly.
 */

/** Keys whose values must never reach the audit trail in plaintext. */
const REDACTED_KEYS = new Set([
  "password",
  "passwordhash",
  "passwordconfirm",
  "currentpassword",
  "newpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "apikey",
  "authorization",
  "cookie",
  "sessiontoken",
  "nidnumber",
  "nidnumberenc",
  "phoneenc",
]);

export const REDACTED_PLACEHOLDER = "[redacted]";

/** True when a field name identifies a value that must never be logged. */
export function isSensitiveKey(key: string): boolean {
  return REDACTED_KEYS.has(key.toLowerCase());
}

/** How deep to walk a payload before giving up, guarding against cycles. */
const MAX_REDACT_DEPTH = 8;

/**
 * Recursively strips credentials and personal identifiers from a payload
 * before it is written to the trail. An audit log is widely readable by
 * design, so it must never become the place a password hash leaks from.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_REDACT_DEPTH || value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(source)) {
      result[key] = REDACTED_KEYS.has(key.toLowerCase())
        ? REDACTED_PLACEHOLDER
        : redact(entry, depth + 1);
    }

    return result;
  }

  return value;
}

/** Values that are equal for diffing purposes (handles dates and objects). */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a === null || b === null || a === undefined || b === undefined) {
    return false;
  }
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

export interface AuditFieldChange {
  from: unknown;
  to: unknown;
}

/**
 * Builds a field-level before/after diff.
 *
 * Storing a diff rather than a full object dump is what makes an update entry
 * reviewable: without it, three consecutive "module.updated" rows look
 * identical and a reviewer cannot tell which one changed the video URL.
 * Returns null when nothing actually changed, so no-op saves can be skipped
 * instead of filling the trail with noise.
 */
export function buildChangeDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): Record<string, AuditFieldChange> | null {
  if (!before || !after) return null;

  const diff: Record<string, AuditFieldChange> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    if (!isEqual(before[key], after[key])) {
      // A sensitive field is masked by NAME as well as by content: redact()
      // only reaches inside objects, so without this check a top-level
      // `password` change would write both the old and new value in plaintext.
      // The row still records THAT the field changed, which is the auditable
      // fact — the values themselves are never the auditor's business.
      if (isSensitiveKey(key)) {
        diff[key] = { from: REDACTED_PLACEHOLDER, to: REDACTED_PLACEHOLDER };
        continue;
      }

      diff[key] = {
        from: redact(before[key]) ?? null,
        to: redact(after[key]) ?? null,
      };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

/** Severity levels, mirrored from the Prisma enum for pure-module use. */
export type AuditSeverityName = "INFO" | "NOTICE" | "WARNING" | "CRITICAL";

/** Severity inferred from the action name when the caller does not set one. */
export function inferSeverity(action: string): AuditSeverityName {
  const normalized = action.toLowerCase();

  if (
    normalized.startsWith("auth.login.failed") ||
    normalized.startsWith("auth.lockout") ||
    normalized.includes("permission") ||
    normalized.includes("role.")
  ) {
    return "CRITICAL";
  }

  if (normalized.endsWith(".deleted") || normalized.includes("suspend")) {
    return "WARNING";
  }

  if (normalized.endsWith(".created") || normalized.endsWith(".updated")) {
    return "NOTICE";
  }

  return "INFO";
}
