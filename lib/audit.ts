import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuditSeverity, Prisma } from "@/lib/generated/prisma/client";
import { inferSeverity, redact } from "@/lib/audit-diff";

export { AuditSeverity };
// Re-exported so callers have a single import for audit concerns; the
// implementations live in audit-diff.ts, which stays free of Next/Prisma
// imports so the redaction and diffing rules can be unit tested.
export { buildChangeDiff, redact } from "@/lib/audit-diff";
export type { AuditFieldChange } from "@/lib/audit-diff";

/**
 * Audit trail.
 *
 * Every entry answers five questions: who did it, what they did, to which
 * record, when, and from where. The last one matters as much as the rest —
 * "who deleted this course" is only half an answer without an IP address.
 *
 * Design rules:
 *
 *  - Writing an audit entry must NEVER break the action being audited. A
 *    logging failure is logged to the console and swallowed; losing a course
 *    edit because the audit insert failed would be worse than losing the
 *    audit row.
 *  - Actor identity is snapshotted as text (actorLabel/actorRole) alongside
 *    the foreign key, so the trail stays readable after a user is renamed,
 *    has their role changed, or is deleted entirely.
 *  - Change payloads are stored as a before/after diff rather than a full
 *    object dump, so a reviewer can see what actually changed.
 */

/** Longest user-agent we store; anything beyond this is noise. */
const MAX_USER_AGENT_LENGTH = 400;

export async function getActorId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Best-effort client IP. Proxies and load balancers put the real address in
 * x-forwarded-for (first entry); the rest are fallbacks for other hosts.
 */
function extractIpAddress(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return (
    headerList.get("x-real-ip") ??
    headerList.get("cf-connecting-ip") ??
    headerList.get("x-vercel-forwarded-for") ??
    null
  );
}

/** Reads request context when available. Returns nulls outside a request. */
export async function getRequestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  try {
    const headerList = await headers();
    const userAgent = headerList.get("user-agent");

    return {
      ipAddress: extractIpAddress(headerList),
      userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
    };
  } catch {
    // headers() throws outside a request scope (background jobs, scripts).
    return { ipAddress: null, userAgent: null };
  }
}

export interface AuditLogInput {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  changes?: unknown;
  /** Overrides the severity inferred from the action name. */
  severity?: AuditSeverity;
  /** Explicit actor label, for events where no user row exists (failed logins). */
  actorLabel?: string | null;
  actorRole?: string | null;
  /** Skips the header lookup when the caller already has request context. */
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes one audit entry.
 *
 * Never throws: a failure here is reported to the console but allowed to pass,
 * because breaking a successful user action to report a logging problem would
 * do more damage than the missing row.
 */
export async function auditLogEntry({
  actorId,
  action,
  entity,
  entityId,
  changes,
  severity,
  actorLabel,
  actorRole,
  ipAddress,
  userAgent,
}: AuditLogInput): Promise<void> {
  try {
    const context =
      ipAddress !== undefined && userAgent !== undefined
        ? { ipAddress, userAgent }
        : await getRequestContext();

    // Snapshot the actor's name/role as text so the entry stays meaningful
    // even after the user is renamed, demoted, or removed.
    let resolvedLabel = actorLabel ?? null;
    let resolvedRole = actorRole ?? null;

    if (actorId && (resolvedLabel === null || resolvedRole === null)) {
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { name: true, email: true, role: true },
      });

      resolvedLabel = resolvedLabel ?? actor?.name ?? actor?.email ?? null;
      resolvedRole = resolvedRole ?? actor?.role ?? null;
    }

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action,
        entity,
        entityId,
        actorLabel: resolvedLabel,
        actorRole: resolvedRole,
        ipAddress: ipAddress ?? context.ipAddress,
        userAgent: userAgent ?? context.userAgent,
        severity: severity ?? inferSeverity(action),
        changes:
          changes === undefined || changes === null
            ? undefined
            : (JSON.parse(
                JSON.stringify(redact(changes)),
              ) as Prisma.InputJsonValue),
      },
    });
  } catch (error) {
    // Deliberately swallowed — see the note on this function.
    console.error("AUDIT_LOG_WRITE_FAILED", { action, entity, entityId, error });
  }
}

/**
 * Records an authentication event. Kept separate because these carry no
 * entity row, frequently have no user id (a failed login against an unknown
 * address), and are the highest-value records in the whole trail.
 */
export async function auditAuthEvent({
  action,
  email,
  userId = null,
  role = null,
  severity,
  detail,
  ipAddress,
  userAgent,
}: {
  action:
    | "auth.login.succeeded"
    | "auth.login.failed"
    | "auth.logout"
    | "auth.lockout";
  email: string;
  userId?: string | null;
  role?: string | null;
  severity?: AuditSeverity;
  detail?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await auditLogEntry({
    actorId: userId,
    action,
    entity: "Auth",
    // Identify the attempt by email — for a failed login there is no user row
    // to point at, and the address attempted is exactly what a reviewer needs.
    entityId: email,
    actorLabel: email,
    actorRole: role,
    severity:
      severity ??
      (action === "auth.login.succeeded" || action === "auth.logout"
        ? AuditSeverity.INFO
        : AuditSeverity.CRITICAL),
    changes: detail,
    ipAddress,
    userAgent,
  });
}
