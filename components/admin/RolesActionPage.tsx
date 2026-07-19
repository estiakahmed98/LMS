"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import { getInitials } from "@/lib/auth";
import { useLocale, useTranslations } from "next-intl";
import {
  BookOpen,
  ClipboardCheck,
  Award,
  FileText,
  GraduationCap,
  History,
  LibraryBig,
  LoaderCircle,
  Lock,
  Save,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import type {
  AdminRoleActivityEntry,
  AdminRoleDetail,
  AdminRolePermissionUpdate,
  AdminRoleSummary,
  AdminRoleUser,
  PermissionModuleValue,
  RoleValue,
} from "@/lib/admin-role-types";
import { ROLE_VALUES } from "@/lib/admin-role-types";
import {
  INSTRUCTOR_MODULE_HINTS,
  MODULE_LABELS,
  STUDENT_MODULE_HINTS,
  isPortalRole,
  modulesForRole,
} from "@/lib/admin-role-types";
import type { AdminUserSummary } from "@/lib/admin-user-types";

const roleOrder: RoleValue[] = [...ROLE_VALUES];

const roleIcons: Record<RoleValue, typeof ShieldCheck> = {
  SUPER_ADMIN: ShieldCheck,
  COURSE_MANAGER: BookOpen,
  EXAMINER: ClipboardCheck,
  REPORT_VIEWER: FileText,
  INSTRUCTOR: GraduationCap,
  STUDENT: Users,
};

const moduleIcons: Record<PermissionModuleValue, typeof Users> = {
  STUDENTS: Users,
  COURSES: BookOpen,
  ASSESSMENTS: ClipboardCheck,
  QUESTION_BANK: LibraryBig,
  SUBMISSIONS: FileText,
  GRADING: GraduationCap,
  CERTIFICATES: Award,
  REPORTS: FileText,
  SETTINGS: SettingsIcon,
  ROLES: Lock,
};

const permissionColumns: Array<{
  key: keyof Omit<AdminRolePermissionUpdate, "module">;
  label: string;
}> = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit", label: "Edit" },
  { key: "canDelete", label: "Delete" },
  { key: "canExport", label: "Export" },
];

function permissionsEqual(
  a: AdminRolePermissionUpdate[],
  b: AdminRolePermissionUpdate[],
) {
  if (a.length !== b.length) return false;
  return a.every((row, index) => {
    const other = b[index];
    return (
      other &&
      row.module === other.module &&
      row.canView === other.canView &&
      row.canCreate === other.canCreate &&
      row.canEdit === other.canEdit &&
      row.canDelete === other.canDelete &&
      row.canExport === other.canExport
    );
  });
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-muted-foreground/25"
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5.5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function RolesActionPage() {
  const t = useTranslations("adminRolesPage");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const dateTimeFormatter = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  function label(
    key: string,
    fallback: string,
    values?: Record<string, string>,
  ) {
    return t.has(key) ? t(key, values) : fallback;
  }

  const [summaries, setSummaries] = useState<AdminRoleSummary[]>([]);
  const [activeRole, setActiveRole] = useState<RoleValue>("COURSE_MANAGER");
  const [detail, setDetail] = useState<AdminRoleDetail | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<
    AdminRolePermissionUpdate[]
  >([]);
  const [activity, setActivity] = useState<AdminRoleActivityEntry[]>([]);

  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [assignQuery, setAssignQuery] = useState("");
  const [assignResults, setAssignResults] = useState<AdminUserSummary[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<AdminRoleUser | null>(null);

  const loadSummaries = useCallback(async () => {
    setLoadingSummaries(true);
    try {
      const response = await fetch("/api/admin/roles");
      if (!response.ok) throw new Error("Failed to load roles.");
      const data = await response.json();
      setSummaries(data.roles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles.");
    } finally {
      setLoadingSummaries(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/roles/activity");
      if (!response.ok) return;
      const data = await response.json();
      setActivity(data.activity ?? []);
    } catch {
      // Non-critical; activity feed silently stays empty on failure.
    }
  }, []);

  const loadDetail = useCallback(async (role: RoleValue) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/roles/${role}`);
      if (!response.ok) throw new Error("Failed to load role detail.");
      const data = await response.json();
      setDetail(data.role);
      setDraftPermissions(
        data.role.permissions.map((row: AdminRolePermissionUpdate) => ({
          ...row,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load role detail.",
      );
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadSummaries();
    loadActivity();
  }, [loadSummaries, loadActivity]);

  useEffect(() => {
    loadDetail(activeRole);
  }, [activeRole, loadDetail]);

  useEffect(() => {
    const query = assignQuery.trim();
    if (query.length < 2) {
      setAssignResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/users?role=STUDENT`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        const users: AdminUserSummary[] = data.users ?? [];
        const normalizedQuery = query.toLowerCase();
        setAssignResults(
          users
            .filter(
              (user) =>
                user.name.toLowerCase().includes(normalizedQuery) ||
                user.email.toLowerCase().includes(normalizedQuery),
            )
            .slice(0, 6),
        );
      } catch {
        // Aborted or transient network error; ignore.
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [assignQuery]);

  const hasUnsavedChanges = useMemo(() => {
    if (!detail) return false;
    return !permissionsEqual(draftPermissions, detail.permissions);
  }, [draftPermissions, detail]);

  function togglePermission(
    module: PermissionModuleValue,
    key: keyof Omit<AdminRolePermissionUpdate, "module">,
  ) {
    setDraftPermissions((current) =>
      current.map((row) =>
        row.module !== module
          ? row
          : key === "canView" && row.canView
            ? {
                ...row,
                canView: false,
                canCreate: false,
                canEdit: false,
                canDelete: false,
                canExport: false,
              }
            : key === "canView"
              ? { ...row, canView: true }
              : { ...row, canView: true, [key]: !row[key] },
      ),
    );
  }

  async function handleSavePermissions() {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/roles/${activeRole}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: draftPermissions }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save permissions.");
      }
      const data = await response.json();
      setDetail(data.role);
      setDraftPermissions(
        data.role.permissions.map((row: AdminRolePermissionUpdate) => ({
          ...row,
        })),
      );
      setNotice(label("notice.permissionsSaved", "Permissions saved."));
      loadSummaries();
      loadActivity();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Failed to save permissions.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDiscardChanges() {
    if (detail) {
      setDraftPermissions(detail.permissions.map((row) => ({ ...row })));
    }
  }

  async function handleAssignUser(userId: string) {
    setAssigning(true);
    try {
      const response = await fetch(`/api/admin/roles/${activeRole}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to assign user.");
      }
      const data = await response.json();
      setDetail(data.role);
      setAssignQuery("");
      setAssignResults([]);
      setNotice(label("notice.userAssigned", "User assigned to role."));
      loadSummaries();
      loadActivity();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to assign user.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemoveUser() {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoveTarget(null);
    try {
      const response = await fetch(
        `/api/admin/roles/${activeRole}/users/${target.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to remove user.");
      }
      const data = await response.json();
      setDetail(data.role);
      setNotice(label("notice.userRemoved", "User removed from role."));
      loadSummaries();
      loadActivity();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to remove user.");
    }
  }

  function roleLabel(role: RoleValue) {
    const key = role
      .toLowerCase()
      .replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    return t.has(`roles.${key}`) ? t(`roles.${key}`) : role.replace(/_/g, " ");
  }

  function moduleLabel(module: PermissionModuleValue) {
    const key = module.toLowerCase();
    return t.has(`modules.${key}`)
      ? t(`modules.${key}`)
      : MODULE_LABELS[module];
  }

  function describeActivity(entry: AdminRoleActivityEntry) {
    const actor = entry.actorName ?? label("activityLog.system", "System");
    if (entry.action === "permissions.updated") {
      const roleName =
        typeof entry.changes?.role === "string"
          ? entry.changes.role
          : entry.entityId;
      return label(
        "activityLog.permissionsUpdated",
        `${actor} updated permissions for ${roleName}.`,
        { actor, role: roleName },
      );
    }
    if (entry.action === "role.assigned") {
      const to = typeof entry.changes?.to === "string" ? entry.changes.to : "";
      return label(
        "activityLog.userAssigned",
        `${actor} assigned a user to ${to}.`,
        { actor, role: to },
      );
    }
    if (entry.action === "role.unassigned") {
      const from =
        typeof entry.changes?.from === "string" ? entry.changes.from : "";
      return label(
        "activityLog.userUnassigned",
        `${actor} removed a user from ${from}.`,
        { actor, role: from },
      );
    }
    return entry.action;
  }

  const isSuperAdmin = activeRole === "SUPER_ADMIN";
  const visibleModules = useMemo(
    () => new Set(modulesForRole(activeRole)),
    [activeRole],
  );
  const visiblePermissionRows = useMemo(
    () => draftPermissions.filter((row) => visibleModules.has(row.module)),
    [draftPermissions, visibleModules],
  );

  function moduleHint(module: PermissionModuleValue): string | null {
    if (activeRole === "INSTRUCTOR" && module in INSTRUCTOR_MODULE_HINTS) {
      return INSTRUCTOR_MODULE_HINTS[
        module as keyof typeof INSTRUCTOR_MODULE_HINTS
      ];
    }
    if (activeRole === "STUDENT" && module in STUDENT_MODULE_HINTS) {
      return STUDENT_MODULE_HINTS[module as keyof typeof STUDENT_MODULE_HINTS];
    }
    return null;
  }

  return (
    <AdminLayout title={tAdmin("rolesPermissions")}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">
            {tAdmin("rolesPermissions")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {label(
              "subtitle",
              "Control what every role can see and do across the platform.",
            )}
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-3">
            {loadingSummaries ? (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {label("loading", "Loading roles…")}
              </div>
            ) : (
              roleOrder.map((role) => {
                const summary = summaries.find((item) => item.role === role);
                const Icon = roleIcons[role];
                const active = role === activeRole;
                return (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-bold ${
                            active ? "text-primary" : "text-card-foreground"
                          }`}
                        >
                          {roleLabel(role)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {label(
                            "roleCard.userCount",
                            `${summary?.userCount ?? 0} user(s)`,
                            { count: String(summary?.userCount ?? 0) },
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {label(
                          "roleCard.modulesEnabled",
                          `${summary?.enabledModuleCount ?? 0}/${summary?.totalModuleCount ?? 9} modules`,
                          {
                            enabled: String(summary?.enabledModuleCount ?? 0),
                            total: String(summary?.totalModuleCount ?? 9),
                          },
                        )}
                      </span>
                      {role === "SUPER_ADMIN" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                          <Lock className="h-3 w-3" />
                          {label("roleCard.systemRole", "System")}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </aside>

          <section className="space-y-6">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {label("permissions.matrixTitle", "Permissions Matrix")}
                  </p>
                  <h2 className="mt-0.5 text-xl font-bold text-card-foreground">
                    {roleLabel(activeRole)}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && !isSuperAdmin && (
                    <button
                      onClick={handleDiscardChanges}
                      disabled={saving}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                    >
                      {label("actions.discard", "Discard")}
                    </button>
                  )}
                  <button
                    onClick={handleSavePermissions}
                    disabled={saving || isSuperAdmin || !hasUnsavedChanges}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {label("actions.saveChanges", "Save Changes")}
                  </button>
                </div>
              </div>

              {isPortalRole(activeRole) && (
                <div className="border-b border-border bg-muted/40 px-5 py-2.5 text-xs text-muted-foreground">
                  {activeRole === "INSTRUCTOR"
                    ? "Instructor portal only uses Courses, Reports, and Settings. Other admin modules do not appear in the instructor sidebar."
                    : "Student portal only uses Courses, Assessments, Question Bank, Certificates, and Settings."}{" "}
                  After Save Changes, refresh the portal page to see sidebar updates.
                </div>
              )}

              {isSuperAdmin && (
                <div className="flex items-center gap-2 border-b border-border bg-amber-50 px-5 py-2.5 text-xs font-medium text-amber-800">
                  <Lock className="h-3.5 w-3.5" />
                  {label(
                    "permissions.systemRoleNotice",
                    "Super Admin has full access to every module and cannot be modified.",
                  )}
                </div>
              )}

              {notice && (
                <p className="border-b border-border px-5 py-2.5 text-sm text-muted-foreground">
                  {notice}
                </p>
              )}

              <div className="overflow-x-auto">
                {loadingDetail ? (
                  <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {label("loading", "Loading…")}
                  </div>
                ) : (
                  <table className="w-full min-w-190">
                    <thead className="border-b border-border bg-muted/50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {label("permissions.module", "Module")}
                        </th>
                        {permissionColumns.map((column) => (
                          <th
                            key={column.key}
                            className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {label(`permissions.${column.key}`, column.label)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visiblePermissionRows.map((row) => {
                        const ModuleIcon = moduleIcons[row.module];
                        const hint = moduleHint(row.module);
                        return (
                          <tr key={row.module} className="hover:bg-muted/30">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <ModuleIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-semibold text-card-foreground">
                                    {moduleLabel(row.module)}
                                  </p>
                                  {hint && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {hint}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            {permissionColumns.map((column) => (
                              <td
                                key={column.key}
                                className="px-4 py-3.5 text-center"
                              >
                                <div className="flex justify-center">
                                  <Toggle
                                    checked={row[column.key]}
                                    disabled={isSuperAdmin}
                                    onChange={() =>
                                      togglePermission(row.module, column.key)
                                    }
                                    label={`${moduleLabel(row.module)} ${column.label}`}
                                  />
                                </div>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            {/* 
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-card-foreground">
                    {label("assignedUsers.title", "Assigned Users")}
                  </h2>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {detail?.users.length ?? 0}
                  </span>
                </div>

                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={assignQuery}
                    onChange={(event) => setAssignQuery(event.target.value)}
                    placeholder={label(
                      "assignedUsers.searchPlaceholder",
                      "Search a student by name or email…",
                    )}
                    disabled={isSuperAdmin}
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                  />
                  {assignResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                      {assignResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleAssignUser(user.id)}
                          disabled={assigning}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-60"
                        >
                          <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-card-foreground">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                  {detail?.users.length ? (
                    detail.users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {getInitials(user.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-card-foreground">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                        {!isSuperAdmin && (
                          <button
                            onClick={() => setRemoveTarget(user)}
                            aria-label={label("assignedUsers.remove", "Remove")}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      {label("assignedUsers.empty", "No users assigned to this role yet.")}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-card-foreground">
                    {label("activityLog.title", "Activity Log")}
                  </h2>
                </div>
                <div className="mt-4 max-h-96 space-y-2.5 overflow-y-auto">
                  {activity.length > 0 ? (
                    activity.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-border bg-background px-3 py-2.5"
                      >
                        <p className="text-sm text-card-foreground">
                          {describeActivity(entry)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dateTimeFormatter.format(new Date(entry.createdAt))}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="flex items-center gap-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      <ShieldQuestion className="h-4 w-4 shrink-0" />
                      {label("activityLog.empty", "No activity recorded yet.")}
                    </p>
                  )}
                </div>
              </div>
            </div> */}
          </section>
        </div>

        {removeTarget && (
          <StudentConfirmModal
            title={label("confirm.removeTitle", "Remove user from role?")}
            description={label(
              "confirm.removeDescription",
              `"${removeTarget.name}" will lose access granted by ${roleLabel(activeRole)}.`,
              { name: removeTarget.name, role: roleLabel(activeRole) },
            )}
            confirmLabel={label("confirm.removeConfirm", "Remove")}
            cancelLabel={label("confirm.cancel", "Cancel")}
            danger
            onCancel={() => setRemoveTarget(null)}
            onConfirm={handleRemoveUser}
          />
        )}
      </div>
    </AdminLayout>
  );
}
