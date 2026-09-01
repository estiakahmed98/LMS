"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileText,
  Globe,
  History,
  KeyRound,
  Lock,
  Monitor,
  PlusCircle,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  Users,
  Video,
} from "lucide-react";
import type { AdminActivityEntry, AuditSeverityValue } from "@/lib/admin-activity-types";

const entityIcons: Record<string, typeof History> = {
  Auth: KeyRound,
  AuditLog: FileText,
  LiveClass: Video,
  LiveClassSession: Video,
  Course: BookOpen,
  Module: BookOpen,
  ModuleQuiz: ClipboardCheck,
  User: UserCog,
  RolePermission: Lock,
  Role: ShieldCheck,
  Upload: Upload,
  Certificate: Award,
  Assessment: ClipboardCheck,
  Enrollment: Users,
  QuestionBankItem: ClipboardCheck,
  QuestionPaper: FileText,
};

function actionIcon(action: string) {
  if (action.startsWith("auth.login.failed") || action.startsWith("auth.lockout")) {
    return ShieldAlert;
  }
  if (action.startsWith("auth.")) return KeyRound;
  if (action.endsWith(".created")) return PlusCircle;
  if (action.endsWith(".deleted")) return Trash2;
  if (action.endsWith(".completed") || action.endsWith(".passed")) {
    return ClipboardCheck;
  }
  if (action === "permissions.updated") return ShieldCheck;
  if (action.startsWith("upload.")) return Upload;
  if (action.endsWith(".exported")) return Download;
  return SettingsIcon;
}

const severityTone: Record<AuditSeverityValue, string> = {
  CRITICAL:
    "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300",
  WARNING:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300",
  NOTICE:
    "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300",
  INFO: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
};

/** Left rail colour, so severity is scannable without reading the badge. */
const severityRail: Record<AuditSeverityValue, string> = {
  CRITICAL: "bg-red-500",
  WARNING: "bg-amber-500",
  NOTICE: "bg-blue-500",
  INFO: "bg-slate-300 dark:bg-slate-700",
};

export function formatActionLabel(action: string) {
  const parts = action.split(".");
  if (parts.length < 2) return action;

  // auth.login.failed -> "login failed"; module.updated -> "module updated"
  const [head, ...rest] = parts;
  const tail = rest.join(" ");
  const subject = head === "auth" ? "" : head.replace(/([A-Z])/g, " $1").trim();

  return `${subject} ${tail}`.replace(/\s+/g, " ").trim();
}

/** Condenses a user-agent into something readable in a table cell. */
function summarizeUserAgent(userAgent: string | null): string | null {
  if (!userAgent) return null;

  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /OPR\//.test(userAgent) ? "Opera"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : null;

  const platform =
    /Windows/.test(userAgent) ? "Windows"
    : /Android/.test(userAgent) ? "Android"
    : /iPhone|iPad|iOS/.test(userAgent) ? "iOS"
    : /Mac OS X/.test(userAgent) ? "macOS"
    : /Linux/.test(userAgent) ? "Linux"
    : null;

  if (browser && platform) return `${browser} on ${platform}`;
  return browser ?? platform ?? null;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

/** True when `changes` is a field-level diff rather than a raw snapshot. */
function isFieldDiff(
  changes: Record<string, unknown>,
): changes is Record<string, { from: unknown; to: unknown }> {
  const values = Object.values(changes);
  return (
    values.length > 0 &&
    values.every(
      (value) =>
        typeof value === "object" &&
        value !== null &&
        "from" in (value as object) &&
        "to" in (value as object),
    )
  );
}

export function groupByDay(
  entries: AdminActivityEntry[],
  formatter: Intl.DateTimeFormat,
) {
  const groups = new Map<string, AdminActivityEntry[]>();
  for (const entry of entries) {
    const key = formatter.format(new Date(entry.createdAt));
    const bucket = groups.get(key) ?? [];
    bucket.push(entry);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries());
}

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof History;
  label: string;
  value: string;
  tone?: "default" | "critical" | "warning";
}) {
  const toneClass =
    tone === "critical"
      ? "text-red-600 dark:text-red-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-card-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

export function EntryRow({
  entry,
  dateTimeFormatter,
  hideActor = false,
}: {
  entry: AdminActivityEntry;
  dateTimeFormatter: Intl.DateTimeFormat;
  /** Omits the actor name/role line — used on a page already scoped to one actor. */
  hideActor?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const EntityIcon = entityIcons[entry.entity] ?? History;
  const ActionIcon = actionIcon(entry.action);
  const actor = entry.actorName ?? "System";
  const agent = summarizeUserAgent(entry.userAgent);
  const hasDetail = Boolean(entry.changes || entry.ipAddress || entry.userAgent);

  return (
    <div className="relative">
      <div className="flex items-stretch">
        <span
          aria-hidden
          className={`w-1 shrink-0 ${severityRail[entry.severity]}`}
        />

        <div
          role={hasDetail ? "button" : undefined}
          tabIndex={hasDetail ? 0 : undefined}
          onClick={() => hasDetail && setExpanded((value) => !value)}
          onKeyDown={(event) => {
            if (hasDetail && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              setExpanded((value) => !value);
            }
          }}
          className={`flex flex-1 items-start gap-3 px-4 py-3.5 text-left transition-colors ${
            hasDetail ? "cursor-pointer hover:bg-muted/40" : "cursor-default"
          }`}
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <EntityIcon className="h-4 w-4" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {!hideActor && entry.actorId ? (
                <Link
                  href={`/admin/activity-log/actor/${entry.actorId}`}
                  onClick={(event) => event.stopPropagation()}
                  className="text-sm font-semibold text-card-foreground hover:text-primary hover:underline"
                >
                  {actor}
                </Link>
              ) : !hideActor ? (
                <span className="text-sm font-semibold text-card-foreground">
                  {actor}
                </span>
              ) : null}
              {!hideActor && entry.actorRole && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {entry.actorRole.replace(/_/g, " ")}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${severityTone[entry.severity]}`}
              >
                <ActionIcon className="h-3 w-3" />
                {formatActionLabel(entry.action)}
              </span>
            </div>

            <p className="mt-1 truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">
                {entry.entity}
              </span>
              {" · "}
              <span className="font-mono">{entry.entityId}</span>
              {!hideActor && entry.actorEmail ? ` · ${entry.actorEmail}` : ""}
            </p>

            {(entry.ipAddress || agent) && (
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {entry.ipAddress && (
                  <span className="inline-flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span className="font-mono">{entry.ipAddress}</span>
                  </span>
                )}
                {agent && (
                  <span className="inline-flex items-center gap-1">
                    <Monitor className="h-3 w-3" />
                    {agent}
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <time
              dateTime={entry.createdAt}
              title={new Date(entry.createdAt).toISOString()}
              className="whitespace-nowrap text-xs text-muted-foreground"
            >
              {dateTimeFormatter.format(new Date(entry.createdAt))}
            </time>
            {hasDetail && (
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            )}
          </div>
        </div>
      </div>

      {expanded && entry.changes && (
        <div className="border-t border-border bg-muted/20 px-5 py-4 pl-10">
          {isFieldDiff(entry.changes) ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-120 text-xs">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4 font-semibold">Field</th>
                    <th className="pb-2 pr-4 font-semibold">Before</th>
                    <th className="pb-2 font-semibold">After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {Object.entries(entry.changes).map(([field, change]) => (
                    <tr key={field} className="align-top">
                      <td className="py-2 pr-4 font-medium text-card-foreground">
                        {field}
                      </td>
                      <td className="py-2 pr-4 font-mono text-red-600 dark:text-red-400">
                        {formatValue(change.from)}
                      </td>
                      <td className="py-2 font-mono text-green-600 dark:text-green-400">
                        {formatValue(change.to)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {Object.entries(entry.changes).map(([field, value]) => (
                <div key={field} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {field}
                  </dt>
                  <dd className="truncate font-mono text-xs text-card-foreground">
                    {formatValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {entry.userAgent && (
            <p className="mt-3 break-all border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
              <span className="font-semibold">User agent:</span>{" "}
              {entry.userAgent}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
