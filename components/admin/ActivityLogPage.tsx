"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  Award,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileText,
  Globe,
  History,
  KeyRound,
  LoaderCircle,
  Lock,
  Monitor,
  PlusCircle,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  Users,
  Video,
} from "lucide-react";
import type {
  AdminActivityEntry,
  AdminActivityPage,
  AuditSeverityValue,
} from "@/lib/admin-activity-types";

const PAGE_SIZE = 25;

type DateFilterValue =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "custom";

const dateFilters: DateFilterValue[] = [
  "all",
  "today",
  "yesterday",
  "last7",
  "last30",
  "custom",
];

const dateFilterLabels: Record<DateFilterValue, string> = {
  all: "All Dates",
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  last30: "Last 30 Days",
  custom: "Custom Range",
};

const severities: AuditSeverityValue[] = [
  "INFO",
  "NOTICE",
  "WARNING",
  "CRITICAL",
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function resolveDateRange(
  filter: DateFilterValue,
  customStart: string,
  customEnd: string,
): { from?: string; to?: string } {
  const today = startOfDay(new Date());

  switch (filter) {
    case "today":
      return { from: today.toISOString(), to: addDays(today, 1).toISOString() };
    case "yesterday":
      return { from: addDays(today, -1).toISOString(), to: today.toISOString() };
    case "last7":
      return {
        from: addDays(today, -6).toISOString(),
        to: addDays(today, 1).toISOString(),
      };
    case "last30":
      return {
        from: addDays(today, -29).toISOString(),
        to: addDays(today, 1).toISOString(),
      };
    case "custom":
      return {
        from: customStart
          ? startOfDay(new Date(customStart)).toISOString()
          : undefined,
        to: customEnd
          ? addDays(startOfDay(new Date(customEnd)), 1).toISOString()
          : undefined,
      };
    default:
      return {};
  }
}

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

function formatActionLabel(action: string) {
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

function groupByDay(
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

function StatCard({
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

function EntryRow({
  entry,
  dateTimeFormatter,
}: {
  entry: AdminActivityEntry;
  dateTimeFormatter: Intl.DateTimeFormat;
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

        <button
          type="button"
          onClick={() => hasDetail && setExpanded((value) => !value)}
          disabled={!hasDetail}
          className={`flex flex-1 items-start gap-3 px-4 py-3.5 text-left transition-colors ${
            hasDetail ? "hover:bg-muted/40" : "cursor-default"
          }`}
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <EntityIcon className="h-4 w-4" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-card-foreground">
                {actor}
              </span>
              {entry.actorRole && (
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
              {entry.actorEmail ? ` · ${entry.actorEmail}` : ""}
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
        </button>
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

export default function ActivityLogPage() {
  const t = useTranslations("adminActivityLogPage");
  const tAdmin = useTranslations("admin");
  const { can } = useAdminPermissions();
  const canExport = can("ROLES", "export");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const dateTimeFormatter = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dayFormatter = new Intl.DateTimeFormat(localeTag, { dateStyle: "full" });
  const numberFormatter = new Intl.NumberFormat(localeTag);

  function label(key: string, fallback: string, values?: Record<string, string>) {
    return t.has(key) ? t(key, values) : fallback;
  }

  const [data, setData] = useState<AdminActivityPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [entity, setEntity] = useState<"all" | string>("all");
  const [action, setAction] = useState<"all" | string>("all");
  const [actorId, setActorId] = useState<"all" | string>("all");
  const [severity, setSeverity] = useState<"all" | AuditSeverityValue>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);

  // Debounced so typing a search term does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const dateRange = useMemo(
    () => resolveDateRange(dateFilter, customStart, customEnd),
    [dateFilter, customStart, customEnd],
  );

  const filterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("query", debouncedQuery);
    if (entity !== "all") params.set("entity", entity);
    if (action !== "all") params.set("action", action);
    if (actorId !== "all") params.set("actorId", actorId);
    if (severity !== "all") params.set("severity", severity);
    if (dateRange.from) params.set("from", dateRange.from);
    if (dateRange.to) params.set("to", dateRange.to);
    return params;
  }, [
    debouncedQuery,
    entity,
    action,
    actorId,
    severity,
    dateRange.from,
    dateRange.to,
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filterParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));

      const response = await fetch(
        `/api/admin/activity-log?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Failed to load activity log.");
      const json: AdminActivityPage = await response.json();
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load activity log.",
      );
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, entity, action, actorId, severity, dateFilter, customStart, customEnd]);

  const hasActiveFilters =
    Boolean(debouncedQuery) ||
    entity !== "all" ||
    action !== "all" ||
    actorId !== "all" ||
    severity !== "all" ||
    dateFilter !== "all";

  function resetFilters() {
    setQuery("");
    setEntity("all");
    setAction("all");
    setActorId("all");
    setSeverity("all");
    setDateFilter("all");
    setCustomStart("");
    setCustomEnd("");
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const groups = useMemo(
    () => groupByDay(data?.entries ?? [], dayFormatter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.entries, localeTag],
  );

  const exportHref = `/api/admin/activity-log/export?${filterParams().toString()}`;
  const stats = data?.stats;

  return (
    <AdminLayout title={tAdmin("activityLog") ?? "Activity Log"}>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">
              {label("title", "Activity Log")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {label(
                "subtitle",
                "A complete record of every action across the platform — who did it, what changed, and where they connected from.",
              )}
            </p>
          </div>

          {canExport && (
            <a
              href={exportHref}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-card-foreground hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              {label("export", "Export CSV")}
            </a>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard
              icon={History}
              label={label("stats.total", "Events")}
              value={numberFormatter.format(stats.total)}
            />
            <StatCard
              icon={ShieldAlert}
              label={label("stats.critical", "Critical")}
              value={numberFormatter.format(stats.critical)}
              tone={stats.critical > 0 ? "critical" : "default"}
            />
            <StatCard
              icon={AlertTriangle}
              label={label("stats.warning", "Warnings")}
              value={numberFormatter.format(stats.warning)}
              tone={stats.warning > 0 ? "warning" : "default"}
            />
            <StatCard
              icon={KeyRound}
              label={label("stats.failedLogins", "Failed logins")}
              value={numberFormatter.format(stats.failedLogins)}
              tone={stats.failedLogins > 0 ? "critical" : "default"}
            />
            <StatCard
              icon={Users}
              label={label("stats.actors", "Active users")}
              value={numberFormatter.format(stats.distinctActors)}
            />
          </div>
        )}

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={label(
                  "filters.searchPlaceholder",
                  "Search actor, action, record ID, or IP…",
                )}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <select
              value={severity}
              onChange={(event) =>
                setSeverity(event.target.value as "all" | AuditSeverityValue)
              }
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">
                {label("filters.allSeverities", "All Severities")}
              </option>
              {severities.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0) + item.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(event.target.value as DateFilterValue)
              }
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              {dateFilters.map((item) => (
                <option key={item} value={item}>
                  {label(`filters.date.${item}`, dateFilterLabels[item])}
                </option>
              ))}
            </select>

            <select
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">{label("filters.allActors", "All Users")}</option>
              {(data?.actors ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={entity}
              onChange={(event) => setEntity(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">
                {label("filters.allEntities", "All Modules")}
              </option>
              {(data?.entities ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm md:col-span-2 xl:col-span-2"
            >
              <option value="all">
                {label("filters.allActions", "All Actions")}
              </option>
              {(data?.actions ?? []).map((item) => (
                <option key={item} value={item}>
                  {formatActionLabel(item)}
                </option>
              ))}
            </select>

            {dateFilter === "custom" && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {label("filters.reset", "Reset")}
              </button>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </section>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-10 text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            {label("loading", "Loading activity…")}
          </div>
        ) : groups.length > 0 ? (
          <div className="space-y-6">
            {groups.map(([day, entries]) => (
              <div key={day}>
                <div className="mb-2 flex items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {day}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {numberFormatter.format(entries.length)}{" "}
                    {entries.length === 1 ? "event" : "events"}
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="divide-y divide-border">
                    {entries.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        dateTimeFormatter={dateTimeFormatter}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {label("empty", "No activity recorded for the selected filters.")}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 text-sm font-semibold text-primary hover:underline"
              >
                {label("filters.reset", "Reset")}
              </button>
            )}
          </div>
        )}

        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {label(
                "pagination.summary",
                `Page ${numberFormatter.format(page)} of ${numberFormatter.format(
                  totalPages,
                )} · ${numberFormatter.format(data.total)} events`,
                {
                  page: numberFormatter.format(page),
                  totalPages: numberFormatter.format(totalPages),
                  total: numberFormatter.format(data.total),
                },
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {label("pagination.previous", "Previous")}
              </button>
              <button
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {label("pagination.next", "Next")}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
