"use client";

import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import type { AdminUserDetail, UserRoleValue, UserStatusValue } from "@/lib/admin-user-types";
import {
  fetchUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  enrollUserInCourse,
  unenrollUserFromCourse,
} from "@/lib/admin-user-client";
import type { AdminCourseSummary } from "@/lib/admin-course-types";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  LoaderCircle,
  Mail,
  Pencil,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const roleOptions: UserRoleValue[] = [
  "STUDENT",
  "INSTRUCTOR",
  "COURSE_MANAGER",
  "EXAMINER",
  "REPORT_VIEWER",
  "SUPER_ADMIN",
];

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

export default function UserDetailPage({ userId }: { userId: string }) {
  const t = useTranslations("adminStudentsPage");
  const tAdmin = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const dateFormatter = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" });

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notice, setNotice] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    phone: "",
    role: "STUDENT" as UserRoleValue,
  });
  const [confirmAction, setConfirmAction] = useState<
    "delete" | "suspend" | "activate" | null
  >(null);
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [courseToAssign, setCourseToAssign] = useState("");
  const [assigning, setAssigning] = useState(false);

  async function loadUser() {
    try {
      setLoading(true);
      const data = await fetchUser(userId);
      setUser(data);
      setDraft({
        name: data.name,
        email: data.email,
        phone: data.phone ?? "",
        role: data.role,
      });
      if (searchParams.get("edit") === "1") {
        setIsEditing(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadCourses() {
    try {
      const response = await fetch("/api/admin/courses", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setCourses(data.courses ?? []);
    } catch {
      // course list is a convenience for the assign dropdown; ignore failures
    }
  }

  useEffect(() => {
    void loadUser();
    void loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const unassignedCourses = courses.filter(
    (course) => !user?.enrollments.some((enrollment) => enrollment.courseId === course.id),
  );

  async function handleAssignCourse() {
    if (!courseToAssign) return;
    try {
      setAssigning(true);
      const updated = await enrollUserInCourse(userId, courseToAssign);
      setUser(updated);
      setCourseToAssign("");
      setNotice("Course assigned.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to assign course.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassignCourse(enrollmentId: string) {
    try {
      const updated = await unenrollUserFromCourse(userId, enrollmentId);
      setUser(updated);
      setNotice("Course removed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to remove course.");
    }
  }

  function openEdit() {
    if (!user) return;
    setDraft({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
    });
    setIsEditing(true);
  }

  async function handleSave() {
    if (!draft.name.trim() || !draft.email.trim()) {
      setNotice("Name and email are required.");
      return;
    }

    try {
      setSaving(true);
      const updated = await updateUser(userId, draft);
      setUser(updated);
      setIsEditing(false);
      setNotice("User updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to update user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!confirmAction || !user) return;

    try {
      if (confirmAction === "delete") {
        await deleteUser(user.id);
        router.push("/admin/users");
        return;
      }
      if (confirmAction === "suspend") {
        const updated = await updateUserStatus(user.id, "SUSPENDED");
        setUser({ ...user, status: updated.status });
        setNotice("User suspended.");
      } else if (confirmAction === "activate") {
        const updated = await updateUserStatus(user.id, "ACTIVE");
        setUser({ ...user, status: updated.status });
        setNotice("User activated.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setConfirmAction(null);
    }
  }

  if (loading) {
    return (
      <AdminLayout title="User Management">
        <div className="flex items-center justify-center p-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (notFound || !user) {
    return (
      <AdminLayout title="User Management">
        <div className="space-y-4 p-6">
          <button
            onClick={() => router.push("/admin/users")}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("detailPage.back")}
          </button>
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            User not found.
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="User Management">
      <div className="space-y-6 p-6">
        <Link
          href="/admin/users"
          className="flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detailPage.back")}
        </Link>

        {notice && (
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
            {notice}
          </div>
        )}

        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm text-muted-foreground">{user.id}</p>
              <h1 className="mt-1 text-2xl font-bold text-card-foreground">
                {user.name}
              </h1>
              <p className="mt-1 text-sm font-semibold text-primary">
                {prettyEnum(user.role)}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </span>
                {user.phone && (
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {user.phone}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Joined {dateFormatter.format(new Date(user.createdAt))}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${statusClass(user.status)}`}
              >
                {prettyEnum(user.status)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={openEdit}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {tCommon("edit")}
                </button>
                {user.status === "SUSPENDED" ? (
                  <button
                    onClick={() => setConfirmAction("activate")}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t("actions.activate")}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmAction("suspend")}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    {t("actions.suspend")}
                  </button>
                )}
                <button
                  onClick={() => setConfirmAction("delete")}
                  className="rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                  aria-label={t("actions.deleteStudent", { name: user.name })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            Courses
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {user.enrollments.length > 0 ? (
              user.enrollments.map((enrollment) => (
                <span
                  key={enrollment.enrollmentId}
                  className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium"
                >
                  {enrollment.courseTitle}
                  <button
                    onClick={() => void handleUnassignCourse(enrollment.enrollmentId)}
                    aria-label={`Remove ${enrollment.courseTitle}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No associated courses.</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <select
              value={courseToAssign}
              onChange={(event) => setCourseToAssign(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a course…</option>
              {unassignedCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => void handleAssignCourse()}
              disabled={!courseToAssign || assigning}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {assigning ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Assign
            </button>
          </div>
        </section>

        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-card-foreground">Edit User</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleSave()}
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
                    onClick={() => setIsEditing(false)}
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
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder={t("editor.fields.fullName")}
                />
                <input
                  value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                  type="email"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder={t("editor.fields.email")}
                />
                <input
                  value={draft.phone}
                  onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder={t("editor.fields.phone")}
                />
                <select
                  value={draft.role}
                  onChange={(event) =>
                    setDraft({ ...draft, role: event.target.value as UserRoleValue })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {roleOptions.map((item) => (
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
              confirmAction === "delete"
                ? t("confirm.deleteTitle")
                : confirmAction === "suspend"
                  ? t("confirm.suspendTitle")
                  : "Activate user"
            }
            description={
              confirmAction === "delete"
                ? t("confirm.deleteDescription", { name: user.name })
                : confirmAction === "suspend"
                  ? t("confirm.suspendDescription", { name: user.name })
                  : `Reactivate ${user.name}'s account?`
            }
            confirmLabel={
              confirmAction === "delete" ? t("confirm.deleteConfirm") : t("confirm.suspendConfirm")
            }
            cancelLabel={t("confirm.cancel")}
            danger={confirmAction === "delete"}
            onCancel={() => setConfirmAction(null)}
            onConfirm={() => void handleConfirm()}
          />
        )}
      </div>
    </AdminLayout>
  );
}
