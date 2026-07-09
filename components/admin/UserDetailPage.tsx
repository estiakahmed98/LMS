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
  updateUserEnrollment,
} from "@/lib/admin-user-client";
import type { AdminCourseSummary } from "@/lib/admin-course-types";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Award,
  Bell,
  BookOpen,
  Calendar,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  History,
  IdCard,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Upload,
  User as UserIcon,
  Users,
  Video,
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

const statusEditOptions: UserStatusValue[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ACTIVE",
  "SUSPENDED",
  "INACTIVE",
];

const enrollmentStatusOptions = ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"] as const;

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

function emptyMark(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function formatSeconds(seconds: number | null | undefined) {
  if (!seconds) return "0m";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

function buildEnrollmentDrafts(user: AdminUserDetail) {
  return Object.fromEntries(
    user.enrollments.map((enrollment) => [
      enrollment.enrollmentId,
      {
        status: enrollment.status,
        progress: String(enrollment.progress),
        completedAt: enrollment.completedAt ? enrollment.completedAt.slice(0, 10) : "",
      },
    ]),
  );
}

export default function UserDetailPage({ userId }: { userId: string }) {
  const t = useTranslations("adminStudentsPage");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const dateFormatter = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" });
  const dateTimeFormatter = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notice, setNotice] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    phone: "",
    role: "STUDENT" as UserRoleValue,
    status: "ACTIVE" as UserStatusValue,
    photoUrl: "" as string | null,
    dateOfBirth: "",
    nidNumber: "",
    address: "",
    city: "",
    postalCode: "",
    password: "",
  });
  const [enrollmentDrafts, setEnrollmentDrafts] = useState<
    Record<string, { status: string; progress: string; completedAt: string }>
  >({});
  const [savingEnrollmentId, setSavingEnrollmentId] = useState<string | null>(null);
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
        status: data.status,
        photoUrl: data.photoUrl,
        dateOfBirth: data.profile.dateOfBirth ? data.profile.dateOfBirth.slice(0, 10) : "",
        nidNumber: data.profile.nidNumber ?? "",
        address: data.profile.address ?? "",
        city: data.profile.city ?? "",
        postalCode: data.profile.postalCode ?? "",
        password: "",
      });
      setEnrollmentDrafts(buildEnrollmentDrafts(data));
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
      setEnrollmentDrafts(buildEnrollmentDrafts(updated));
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
      setEnrollmentDrafts(buildEnrollmentDrafts(updated));
      setNotice("Course removed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to remove course.");
    }
  }

  async function handleUpdateEnrollment(enrollmentId: string) {
    const enrollmentDraft = enrollmentDrafts[enrollmentId];
    if (!enrollmentDraft) return;

    const progress = Number(enrollmentDraft.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      setNotice("Progress must be between 0 and 100.");
      return;
    }

    try {
      setSavingEnrollmentId(enrollmentId);
      const updated = await updateUserEnrollment(userId, enrollmentId, {
        status: enrollmentDraft.status as (typeof enrollmentStatusOptions)[number],
        progress,
        completedAt: enrollmentDraft.completedAt || null,
      });
      setUser(updated);
      setEnrollmentDrafts(buildEnrollmentDrafts(updated));
      setNotice("Enrollment updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to update enrollment.");
    } finally {
      setSavingEnrollmentId(null);
    }
  }

  function openEdit() {
    if (!user) return;
    setDraft({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
      status: user.status,
      photoUrl: user.photoUrl,
      dateOfBirth: user.profile.dateOfBirth ? user.profile.dateOfBirth.slice(0, 10) : "",
      nidNumber: user.profile.nidNumber ?? "",
      address: user.profile.address ?? "",
      city: user.profile.city ?? "",
      postalCode: user.profile.postalCode ?? "",
      password: "",
    });
    setIsEditing(true);
  }

  async function handlePhotoUpload(file: File) {
    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setDraft((prev) => ({ ...prev, photoUrl: data.url }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
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
      setEnrollmentDrafts(buildEnrollmentDrafts(updated));
      setDraft((prev) => ({ ...prev, password: "" }));
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
            <div className="flex items-start gap-4">
              {user.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoUrl}
                  alt={user.name}
                  className="h-16 w-16 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                  <UserIcon className="h-7 w-7" />
                </div>
              )}
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
            <IdCard className="h-4 w-4 text-primary" />
            Profile Details
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
              <p className="mt-0.5 text-card-foreground">
                {user.profile.dateOfBirth
                  ? dateFormatter.format(new Date(user.profile.dateOfBirth))
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">NID Number</p>
              <p className="mt-0.5 text-card-foreground">{user.profile.nidNumber || "-"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Address
              </p>
              <p className="mt-0.5 text-card-foreground">
                {[user.profile.address, user.profile.city, user.profile.postalCode]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            Enrollments
          </h2>

          <div className="mt-3 overflow-x-auto">
            {user.enrollments.length > 0 ? (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Course</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Progress</th>
                    <th className="px-3 py-2 font-semibold">Enrolled</th>
                    <th className="px-3 py-2 font-semibold">Completed</th>
                    <th className="px-3 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {user.enrollments.map((enrollment) => {
                    const enrollmentDraft = enrollmentDrafts[enrollment.enrollmentId] ?? {
                      status: enrollment.status,
                      progress: String(enrollment.progress),
                      completedAt: enrollment.completedAt
                        ? enrollment.completedAt.slice(0, 10)
                        : "",
                    };
                    return (
                      <tr key={enrollment.enrollmentId}>
                        <td className="px-3 py-3 font-medium text-card-foreground">
                          {enrollment.courseTitle}
                          <p className="mt-0.5 font-mono text-xs font-normal text-muted-foreground">
                            {enrollment.courseId}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={enrollmentDraft.status}
                            onChange={(event) =>
                              setEnrollmentDrafts((prev) => ({
                                ...prev,
                                [enrollment.enrollmentId]: {
                                  ...enrollmentDraft,
                                  status: event.target.value,
                                },
                              }))
                            }
                            className="w-36 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                          >
                            {enrollmentStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {prettyEnum(status)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            value={enrollmentDraft.progress}
                            onChange={(event) =>
                              setEnrollmentDrafts((prev) => ({
                                ...prev,
                                [enrollment.enrollmentId]: {
                                  ...enrollmentDraft,
                                  progress: event.target.value,
                                },
                              }))
                            }
                            type="number"
                            min={0}
                            max={100}
                            className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                          />
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {dateFormatter.format(new Date(enrollment.enrolledAt))}
                        </td>
                        <td className="px-3 py-3">
                          <input
                            value={enrollmentDraft.completedAt}
                            onChange={(event) =>
                              setEnrollmentDrafts((prev) => ({
                                ...prev,
                                [enrollment.enrollmentId]: {
                                  ...enrollmentDraft,
                                  completedAt: event.target.value,
                                },
                              }))
                            }
                            type="date"
                            className="w-36 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => void handleUpdateEnrollment(enrollment.enrollmentId)}
                              disabled={savingEnrollmentId === enrollment.enrollmentId}
                              className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                            >
                              {savingEnrollmentId === enrollment.enrollmentId ? "Saving" : "Save"}
                            </button>
                            <button
                              onClick={() => void handleUnassignCourse(enrollment.enrollmentId)}
                              aria-label={`Remove ${enrollment.courseTitle}`}
                              className="rounded-lg border border-border p-1.5 text-destructive hover:bg-muted"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
              <option value="">Select a course...</option>
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

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
            <ClipboardList className="h-4 w-4 text-primary" />
            Submissions
          </h2>
          <div className="mt-3 overflow-x-auto">
            {user.submissions.length ? (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Assessment</th>
                    <th className="px-3 py-2 font-semibold">Course</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Marks</th>
                    <th className="px-3 py-2 font-semibold">Submitted</th>
                    <th className="px-3 py-2 font-semibold">Graded</th>
                    <th className="px-3 py-2 font-semibold">Files</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {user.submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td className="px-3 py-3 font-medium">{submission.assessmentTitle}</td>
                      <td className="px-3 py-3 text-muted-foreground">{submission.courseTitle}</td>
                      <td className="px-3 py-3">{prettyEnum(submission.status)}</td>
                      <td className="px-3 py-3">
                        {submission.obtainedMarks ?? "-"} / {submission.totalMarks}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {submission.submittedAt
                          ? dateTimeFormatter.format(new Date(submission.submittedAt))
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {submission.gradedAt
                          ? dateTimeFormatter.format(new Date(submission.gradedAt))
                          : "-"}
                      </td>
                      <td className="px-3 py-3">{submission.answerSheetUrls.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">No submissions found.</p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Award className="h-4 w-4 text-primary" />
              Certificates
            </h2>
            <div className="mt-3 space-y-3">
              {user.certificates.length ? (
                user.certificates.map((certificate) => (
                  <div key={certificate.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{certificate.courseTitle}</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {certificate.certificateNumber}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dateFormatter.format(new Date(certificate.issueDate))}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No certificates found.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </h2>
            <div className="mt-3 space-y-3">
              {user.notifications.length ? (
                user.notifications.map((notification) => (
                  <div key={notification.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{notification.title}</p>
                        <p className="mt-1 text-muted-foreground">{notification.message}</p>
                      </div>
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                        {prettyEnum(notification.type)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {dateTimeFormatter.format(new Date(notification.createdAt))}
                      {notification.readAt ? " | Read" : " | Unread"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No notifications found.</p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
            <Video className="h-4 w-4 text-primary" />
            Video Progress
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {user.videoProgress.length ? (
              user.videoProgress.map((progress) => (
                <div key={progress.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{progress.moduleTitle}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{progress.courseTitle}</p>
                    </div>
                    <span className="text-sm font-semibold">{Math.round(progress.watchedPercent)}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, Math.max(0, progress.watchedPercent))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatSeconds(progress.positionSeconds)} / {formatSeconds(progress.durationSeconds)}
                    {progress.completed ? " | Completed" : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No video progress found.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
            <Users className="h-4 w-4 text-primary" />
            Instructor Live Classes
          </h2>
          <div className="mt-3 space-y-4">
            {user.liveClasses.length ? (
              user.liveClasses.map((liveClass) => (
                <div key={liveClass.id} className="rounded-lg border border-border p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{liveClass.title}</p>
                      <p className="mt-1 text-muted-foreground">
                        {liveClass.courseTitle} | {liveClass.subjectName} | {liveClass.batchName}
                      </p>
                    </div>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {prettyEnum(liveClass.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground md:grid-cols-4">
                    <p>Meeting: {prettyEnum(liveClass.meetingType)}</p>
                    <p>Recurrence: {prettyEnum(liveClass.recurrence)}</p>
                    <p>Duration: {liveClass.durationMinutes}m</p>
                    <p>Sessions: {liveClass.sessions.length}</p>
                  </div>
                  {liveClass.sessions.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-left text-xs">
                        <thead className="border-b border-border text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1.5 font-semibold">Scheduled</th>
                            <th className="px-2 py-1.5 font-semibold">Status</th>
                            <th className="px-2 py-1.5 font-semibold">Attendance</th>
                            <th className="px-2 py-1.5 font-semibold">Recording</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {liveClass.sessions.map((session) => (
                            <tr key={session.id}>
                              <td className="px-2 py-2">
                                {dateTimeFormatter.format(new Date(session.scheduledStart))}
                              </td>
                              <td className="px-2 py-2">{prettyEnum(session.status)}</td>
                              <td className="px-2 py-2">{session.attendanceCount}</td>
                              <td className="px-2 py-2">{session.recordingUrl ? "Yes" : "No"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No instructor live classes found.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
            <FileText className="h-4 w-4 text-primary" />
            Live Class Attendances
          </h2>
          <div className="mt-3 overflow-x-auto">
            {user.attendances.length ? (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Class</th>
                    <th className="px-3 py-2 font-semibold">Course</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Join</th>
                    <th className="px-3 py-2 font-semibold">Leave</th>
                    <th className="px-3 py-2 font-semibold">Duration</th>
                    <th className="px-3 py-2 font-semibold">Speak time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {user.attendances.map((attendance) => (
                    <tr key={attendance.id}>
                      <td className="px-3 py-3 font-medium">{attendance.liveClassTitle}</td>
                      <td className="px-3 py-3 text-muted-foreground">{attendance.courseTitle}</td>
                      <td className="px-3 py-3">{prettyEnum(attendance.status)}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {attendance.joinTime
                          ? dateTimeFormatter.format(new Date(attendance.joinTime))
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {attendance.leaveTime
                          ? dateTimeFormatter.format(new Date(attendance.leaveTime))
                          : "-"}
                      </td>
                      <td className="px-3 py-3">{emptyMark(attendance.durationMinutes)}m</td>
                      <td className="px-3 py-3">{formatSeconds(attendance.speakTimeSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">No attendance records found.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
            <History className="h-4 w-4 text-primary" />
            Audit Logs
          </h2>
          <div className="mt-3 overflow-x-auto">
            {user.auditLogs.length ? (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Action</th>
                    <th className="px-3 py-2 font-semibold">Entity</th>
                    <th className="px-3 py-2 font-semibold">Entity ID</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {user.auditLogs.map((auditLog) => (
                    <tr key={auditLog.id}>
                      <td className="px-3 py-3 font-medium">{auditLog.action}</td>
                      <td className="px-3 py-3">{auditLog.entity}</td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                        {auditLog.entityId}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {dateTimeFormatter.format(new Date(auditLog.createdAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">No audit logs found.</p>
            )}
          </div>
        </section>

        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-7xl overflow-y-auto rounded-lg border border-border bg-card p-5 space-y-4">
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

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="grid gap-3">
                  <div className="flex items-center gap-3">
                    {draft.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={draft.photoUrl}
                        alt=""
                        className="h-14 w-14 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                        <UserIcon className="h-6 w-6" />
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
                      {uploadingPhoto ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingPhoto}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void handlePhotoUpload(file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    Full name
                    <input
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                      placeholder={t("editor.fields.fullName")}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    Email
                    <input
                      value={draft.email}
                      onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                      type="email"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                      placeholder={t("editor.fields.email")}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    Phone
                    <input
                      value={draft.phone}
                      onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                      placeholder={t("editor.fields.phone")}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                      Role
                      <select
                        value={draft.role}
                        onChange={(event) =>
                          setDraft({ ...draft, role: event.target.value as UserRoleValue })
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                      >
                        {roleOptions.map((item) => (
                          <option key={item} value={item}>
                            {prettyEnum(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                      Status
                      <select
                        value={draft.status}
                        onChange={(event) =>
                          setDraft({ ...draft, status: event.target.value as UserStatusValue })
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                      >
                        {statusEditOptions.map((item) => (
                          <option key={item} value={item}>
                            {prettyEnum(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    New password
                    <div className="relative">
                      <input
                        value={draft.password}
                        onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                        type={showPassword ? "text" : "password"}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm font-normal"
                        placeholder={
                          user.hasPassword ? "Leave blank to keep current password" : "Set password"
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-card-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </label>
                </div>

                <div className="grid gap-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Profile Details
                  </p>
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    Date of birth
                    <input
                      value={draft.dateOfBirth}
                      onChange={(event) =>
                        setDraft({ ...draft, dateOfBirth: event.target.value })
                      }
                      type="date"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    NID number
                    <input
                      value={draft.nidNumber}
                      onChange={(event) =>
                        setDraft({ ...draft, nidNumber: event.target.value })
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                      placeholder="National ID number"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    Address
                    <input
                      value={draft.address}
                      onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                      placeholder="Street address"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                      City
                      <input
                        value={draft.city}
                        onChange={(event) => setDraft({ ...draft, city: event.target.value })}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                        placeholder="City"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                      Postal code
                      <input
                        value={draft.postalCode}
                        onChange={(event) =>
                          setDraft({ ...draft, postalCode: event.target.value })
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                        placeholder="Postal code"
                      />
                    </label>
                  </div>
                </div>
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
