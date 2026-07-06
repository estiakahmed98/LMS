"use client";

import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import type {
  AdminCoursePayload,
  AdminCourseSummary,
  CourseLevelValue,
  CourseStatusValue,
} from "@/lib/admin-course-types";
import {
  createCourse,
  deleteCourse,
  fetchCourses,
  updateCourse,
  uploadAdminFile,
} from "@/lib/admin-course-client";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Clock3,
  Layers,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const courseStatuses: CourseStatusValue[] = ["PUBLISHED", "DRAFT", "ARCHIVED"];
const courseLevels: CourseLevelValue[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
];

const emptyDraft: AdminCoursePayload = {
  title: "",
  description: "",
  durationHours: 1,
  level: "BEGINNER",
  categoryName: "",
  status: "DRAFT",
  coverImage: null,
};

function statusClass(status: CourseStatusValue) {
  if (status === "PUBLISHED") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (status === "DRAFT") {
    return "border-yellow-200 bg-yellow-50 text-yellow-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function prettyEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function CoursesCrudPage() {
  const t = useTranslations("adminCoursesPage");
  const tAdmin = useTranslations("admin");
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [draft, setDraft] = useState<AdminCoursePayload>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("Loading courses...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCourseSummary | null>(
    null,
  );

  async function loadCourses() {
    try {
      setLoading(true);
      const data = await fetchCourses();
      setCourses(data);
      setNotice(data.length ? "Courses loaded." : "No courses found yet.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCourses();
  }, []);

  function openNewCourse() {
    setEditingId(null);
    setDraft(emptyDraft);
    setNotice(t("notice.newDraftReady"));
    setIsEditorOpen(true);
  }

  function openEditCourse(course: AdminCourseSummary) {
    setEditingId(course.id);
    setDraft({
      title: course.title,
      description: course.description,
      durationHours: course.durationHours,
      level: course.level,
      categoryName: course.categoryName ?? "",
      status: course.status,
      coverImage: course.coverImage,
    });
    setNotice(t("notice.editing", { title: course.title }));
    setIsEditorOpen(true);
  }

  async function handleSaveCourse() {
    try {
      setSaving(true);
      if (editingId) {
        await updateCourse(editingId, draft);
        setNotice(t("notice.saved"));
      } else {
        await createCourse(draft);
        setNotice(t("notice.saved"));
      }
      setIsEditorOpen(false);
      await loadCourses();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save course.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCourse() {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteCourse(deleteTarget.id);
      setDeleteTarget(null);
      setNotice(t("notice.deleted"));
      await loadCourses();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to delete course.",
      );
    }
  }

  async function handleCoverUpload(file: File) {
    try {
      setUploading(true);
      const upload = await uploadAdminFile(file, "courses");
      setDraft((current) => ({ ...current, coverImage: upload.url }));
      setNotice(`Uploaded ${upload.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminLayout title={tAdmin("courses")}>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">
              {tAdmin("courses")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{notice}</p>
          </div>
          <button
            onClick={openNewCourse}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {t("actions.newCourse")}
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card">
            <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No courses have been created yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="relative aspect-video w-full bg-muted">
                  <Image
                    src={course.coverImage || "/assets/courses.png"}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {course.categoryName || "Uncategorized"}
                      </p>
                      <h2 className="mt-1 text-lg font-bold text-card-foreground">
                        {course.title}
                      </h2>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(course.status)}`}
                    >
                      {prettyEnum(course.status)}
                    </span>
                  </div>

                  <p className="mt-3 flex-1 text-sm text-muted-foreground">
                    {course.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {t("courseCard.enrolled", {
                        count: course.enrolledCount,
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4" />
                      {t("courseCard.moduleCount", {
                        count: course.moduleCount,
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" />
                      {course.durationHours}h
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      {t("actions.viewModules")}
                    </Link>
                    <button
                      onClick={() => openEditCourse(course)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      {t("actions.edit")}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(course)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("actions.delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                    {t("editor.eyebrow")}
                  </p>
                  <h2 className="text-xl font-bold text-card-foreground">
                    {draft.title || t("editor.newCourse")}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleSaveCourse()}
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
                <div className="flex items-center gap-3">
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    <Image
                      src={draft.coverImage || "/assets/courses.png"}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-center text-sm font-semibold hover:bg-muted">
                    {uploading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {t("editor.fields.coverImage")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }
                        void handleCoverUpload(file);
                      }}
                    />
                  </label>
                </div>

                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder={t("editor.fields.courseTitle")}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />

                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder={t("editor.fields.description")}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={draft.categoryName}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        categoryName: event.target.value,
                      }))
                    }
                    placeholder="Category"
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={draft.durationHours}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        durationHours: Number(event.target.value || 1),
                      }))
                    }
                    placeholder="Duration hours"
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    value={draft.level}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        level: event.target.value as CourseLevelValue,
                      }))
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {courseLevels.map((level) => (
                      <option key={level} value={level}>
                        {prettyEnum(level)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        status: event.target.value as CourseStatusValue,
                      }))
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {courseStatuses.map((status) => (
                      <option key={status} value={status}>
                        {prettyEnum(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <StudentConfirmModal
            title={t("confirm.deleteTitle")}
            description={t("confirm.deleteDescription", {
              title: deleteTarget.title,
            })}
            confirmLabel={t("confirm.deleteConfirm")}
            cancelLabel={t("confirm.cancel")}
            danger
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => void handleDeleteCourse()}
          />
        )}
      </div>
    </AdminLayout>
  );
}
