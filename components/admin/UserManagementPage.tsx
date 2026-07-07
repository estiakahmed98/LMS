"use client";

import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import type {
  AdminUserSummary,
  UserRoleValue,
  UserStatusValue,
} from "@/lib/admin-user-types";
import {
  createUser,
  deleteUser,
  fetchUsers,
  updateUserStatus,
} from "@/lib/admin-user-client";
import { fetchCourses } from "@/lib/admin-course-client";
import type { AdminCourseSummary } from "@/lib/admin-course-types";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldOff,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;

const roleOptions: Array<"all" | UserRoleValue> = [
  "all",
  "STUDENT",
  "INSTRUCTOR",
  "COURSE_MANAGER",
  "EXAMINER",
  "REPORT_VIEWER",
  "SUPER_ADMIN",
];

const statusOptions: Array<"all" | UserStatusValue> = [
  "all",
  "ACTIVE",
  "PENDING",
  "APPROVED",
  "SUSPENDED",
  "INACTIVE",
  "REJECTED",
];

const emptyDraft = {
  name: "",
  email: "",
  password: "",
  role: "STUDENT" as UserRoleValue,
  phone: "",
};

function prettyEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClass(status: UserStatusValue) {
  if (status === "ACTIVE" || status === "APPROVED") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (status === "PENDING") {
    return "border-yellow-200 bg-yellow-50 text-yellow-800";
  }
  if (status === "SUSPENDED" || status === "REJECTED") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function UserManagementPage() {
  const t = useTranslations("adminStudentsPage");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);
  const dateFormatter = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
  });

  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | UserRoleValue>("all");
  const [status, setStatus] = useState<"all" | UserStatusValue>("all");
  const [courseId, setCourseId] = useState<"all" | string>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("Loading users...");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [confirmAction, setConfirmAction] = useState<
    | { type: "delete"; user: AdminUserSummary }
    | { type: "suspend"; user: AdminUserSummary }
    | { type: "activate"; user: AdminUserSummary }
    | null
  >(null);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
      setNotice(data.length ? "Users loaded." : "No users found yet.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCourses() {
    try {
      const data = await fetchCourses();
      setCourses(data);
    } catch {
      // Course filter is best-effort; ignore failures here.
    }
  }

  useEffect(() => {
    void loadUsers();
    void loadCourses();
  }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesQuery =
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase());
        const matchesRole = role === "all" || user.role === role;
        const matchesStatus = status === "all" || user.status === status;
        const matchesCourse =
          courseId === "all" || user.courses.some((course) => course.id === courseId);
        return matchesQuery && matchesRole && matchesStatus && matchesCourse;
      }),
    [users, query, role, status, courseId],
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, role, status, courseId]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedUsers = useMemo(
    () => filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredUsers, page],
  );

  function openNewUser() {
    setDraft(emptyDraft);
    setNotice("New user draft ready.");
    setIsEditorOpen(true);
  }

  async function handleSaveUser() {
    if (!draft.name.trim() || !draft.email.trim() || draft.password.length < 8) {
      setNotice("Name, email, and an 8+ character password are required.");
      return;
    }

    try {
      setSaving(true);
      await createUser(draft);
      setNotice("User created.");
      setIsEditorOpen(false);
      await loadUsers();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to create user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === "delete") {
        await deleteUser(confirmAction.user.id);
        setNotice(`${confirmAction.user.name} deleted.`);
      } else if (confirmAction.type === "suspend") {
        await updateUserStatus(confirmAction.user.id, "SUSPENDED");
        setNotice(`${confirmAction.user.name} suspended.`);
      } else if (confirmAction.type === "activate") {
        await updateUserStatus(confirmAction.user.id, "ACTIVE");
        setNotice(`${confirmAction.user.name} activated.`);
      }
      await loadUsers();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setConfirmAction(null);
    }
  }

  return (
    <AdminLayout title="User Management">
      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_160px_160px_200px_auto]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "all" | UserRoleValue)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              {roleOptions.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All Roles" : prettyEnum(item)}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "all" | UserStatusValue)
              }
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All Statuses" : prettyEnum(item)}
                </option>
              ))}
            </select>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <button
              onClick={openNewUser}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              {t("actions.newStudent")}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">{notice}</span>
          </div>
        </section>

        <section className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-230">
                <thead className="border-b border-border bg-muted/70">
                  <tr>
                    {[
                      t("table.fullName"),
                      "Role",
                      "Courses",
                      t("table.lastActive"),
                      t("table.status"),
                      t("table.actions"),
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center">
                        <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-card-foreground">
                            {user.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {prettyEnum(user.role)}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {user.courses.length ? (
                            <div className="flex flex-wrap gap-1">
                              {user.courses.slice(0, 2).map((course) => (
                                <span
                                  key={course.id}
                                  className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs"
                                >
                                  {course.title}
                                </span>
                              ))}
                              {user.courses.length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                  +{user.courses.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {user.lastActive
                            ? dateFormatter.format(new Date(user.lastActive))
                            : "—"}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(user.status)}`}
                          >
                            {prettyEnum(user.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Details
                            </Link>
                            <Link
                              href={`/admin/users/${user.id}?edit=1`}
                              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t("actions.edit")}
                            </Link>
                            {user.status === "SUSPENDED" ? (
                              <button
                                onClick={() =>
                                  setConfirmAction({ type: "activate", user })
                                }
                                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {t("actions.activate")}
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setConfirmAction({ type: "suspend", user })
                                }
                                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                              >
                                <ShieldOff className="h-3.5 w-3.5" />
                                {t("actions.suspend")}
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmAction({ type: "delete", user })}
                              className="rounded-lg border border-border p-1.5 text-destructive hover:bg-muted"
                              aria-label={t("actions.deleteStudent", {
                                name: user.name,
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  {!loading && paginatedUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        {t("table.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {t("pagination.summary", {
                  page: numberFormatter.format(page),
                  totalPages: numberFormatter.format(totalPages),
                  total: numberFormatter.format(filteredUsers.length),
                })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t("pagination.previous")}
                </button>
                <button
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("pagination.next")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {t("editor.title")}
                  </p>
                  <h2 className="text-xl font-bold text-card-foreground">
                    {draft.name || t("editor.newStudent")}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleSaveUser()}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {saving ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t("editor.save")}
                  </button>
                  <button
                    onClick={() => setIsEditorOpen(false)}
                    aria-label={t("editor.close")}
                    className="rounded-lg border border-border p-2 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder={t("editor.fields.fullName")}
                />
                <input
                  value={draft.email}
                  onChange={(event) =>
                    setDraft({ ...draft, email: event.target.value })
                  }
                  type="email"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder={t("editor.fields.email")}
                />
                <input
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft({ ...draft, phone: event.target.value })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder={t("editor.fields.phone")}
                />
                <input
                  value={draft.password}
                  onChange={(event) =>
                    setDraft({ ...draft, password: event.target.value })
                  }
                  type="password"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Password (min. 8 characters)"
                />
                <select
                  value={draft.role}
                  onChange={(event) =>
                    setDraft({ ...draft, role: event.target.value as UserRoleValue })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {roleOptions
                    .filter((item) => item !== "all")
                    .map((item) => (
                      <option key={item} value={item}>
                        {prettyEnum(item)}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {confirmAction && (
          <StudentConfirmModal
            title={
              confirmAction.type === "delete"
                ? t("confirm.deleteTitle")
                : confirmAction.type === "suspend"
                  ? t("confirm.suspendTitle")
                  : "Activate user"
            }
            description={
              confirmAction.type === "delete"
                ? t("confirm.deleteDescription", {
                    name: confirmAction.user.name,
                  })
                : confirmAction.type === "suspend"
                  ? t("confirm.suspendDescription", {
                      name: confirmAction.user.name,
                    })
                  : `Reactivate ${confirmAction.user.name}'s account?`
            }
            confirmLabel={
              confirmAction.type === "delete"
                ? t("confirm.deleteConfirm")
                : t("confirm.suspendConfirm")
            }
            cancelLabel={t("confirm.cancel")}
            danger={confirmAction.type === "delete"}
            onCancel={() => setConfirmAction(null)}
            onConfirm={() => void handleConfirm()}
          />
        )}
      </div>
    </AdminLayout>
  );
}
