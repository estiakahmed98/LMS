"use client";

import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import type {
  AdminCourseDetail,
  AdminModuleDetail,
  AdminModulePayload,
  ModuleTypeValue,
} from "@/lib/admin-course-types";
import {
  createModule,
  deleteModule,
  fetchCourse,
  updateModule,
  uploadAdminFile,
} from "@/lib/admin-course-client";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Clock,
  FileText,
  LayoutGrid,
  List,
  LoaderCircle,
  Play,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ViewMode = "grid" | "list";

const moduleTypes: ModuleTypeValue[] = ["VIDEO", "READING", "QUIZ", "PRACTICE"];

function prettyEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDraft(module: AdminModuleDetail | null, nextOrder: number): AdminModulePayload {
  if (!module) {
    return {
      title: "",
      order: nextOrder,
      type: "VIDEO",
      durationMinutes: 0,
      coverImage: null,
      videoUrl: null,
      overview: null,
      hasQuiz: false,
      notes: [],
      resources: [],
      quiz: null,
    };
  }

  return {
    title: module.title,
    order: module.order,
    type: module.type,
    durationMinutes: module.durationMinutes,
    coverImage: module.coverImage,
    videoUrl: module.videoUrl,
    overview: module.overview,
    hasQuiz: module.hasQuiz,
    notes: module.notes,
    resources: module.resources,
    quiz: module.quiz
      ? {
          passingScore: module.quiz.passingScore,
          questions: module.quiz.questions,
        }
      : null,
  };
}

export default function CourseModulesPage({
  courseId,
}: {
  courseId: string;
}) {
  const t = useTranslations("adminCoursesPage");
  const tAdmin = useTranslations("admin");
  const router = useRouter();
  const [course, setCourse] = useState<AdminCourseDetail | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [notice, setNotice] = useState("Loading course...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminModulePayload>(toDraft(null, 1));
  const [deleteTarget, setDeleteTarget] = useState<AdminModuleDetail | null>(
    null,
  );
  const [previewModule, setPreviewModule] = useState<AdminModuleDetail | null>(
    null,
  );

  async function loadCourse() {
    try {
      setLoading(true);
      const data = await fetchCourse(courseId);
      setCourse(data);
      setNotice("Course loaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to load course.");
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCourse();
  }, [courseId]);

  const sortedModules = useMemo(
    () => [...(course?.modules ?? [])].sort((a, b) => a.order - b.order),
    [course?.modules],
  );

  function openNewModule() {
    setEditingModuleId(null);
    setDraft(toDraft(null, sortedModules.length + 1));
    setNotice(t("notice.newDraftReady"));
    setIsEditorOpen(true);
  }

  function openEditModule(module: AdminModuleDetail) {
    setEditingModuleId(module.id);
    setDraft(toDraft(module, module.order));
    setNotice(t("notice.editing", { title: module.title }));
    setIsEditorOpen(true);
  }

  async function handleSaveModule() {
    if (!course) {
      return;
    }

    try {
      setSaving(true);
      if (editingModuleId) {
        await updateModule(course.id, editingModuleId, draft);
      } else {
        await createModule(course.id, draft);
      }
      setIsEditorOpen(false);
      setNotice(t("notice.saved"));
      await loadCourse();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save module.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModule() {
    if (!course || !deleteTarget) {
      return;
    }

    try {
      await deleteModule(course.id, deleteTarget.id);
      setDeleteTarget(null);
      setNotice(t("notice.deleted"));
      await loadCourse();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to delete module.");
    }
  }

  async function handleCoverUpload(file: File) {
    try {
      setUploading(true);
      const upload = await uploadAdminFile(file, "course-modules");
      setDraft((current) => ({ ...current, coverImage: upload.url }));
      setNotice(`Uploaded ${upload.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (!loading && !course) {
    return (
      <AdminLayout title={tAdmin("courses")}>
        <div className="space-y-4 p-6">
          <button
            onClick={() => router.push("/admin/courses")}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("modulesPage.back")}
          </button>
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            {t("modulesPage.notFound")}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={tAdmin("courses")}>
      <div className="space-y-6 p-6">
        <Link
          href="/admin/courses"
          className="flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("modulesPage.back")}
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">
              {course?.title || "Courses"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{notice}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-1.5 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-md p-1.5 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={openNewModule}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              {t("modulesPage.newModule")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card">
            <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sortedModules.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No modules have been created for this course yet.
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedModules.map((module) => (
              <div
                key={module.id}
                className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="relative aspect-video w-full bg-muted">
                  <Image
                    src={module.coverImage || "/assets/module_image.jpg"}
                    alt={module.title}
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => setPreviewModule(module)}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md">
                      <Play className="h-5 w-5 fill-black text-black" />
                    </div>
                  </button>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {t("modulesPage.moduleOrder", { order: module.order })}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-card-foreground">
                    {module.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">
                    {module.overview || t("modulesPage.noOverview")}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {module.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      {module.resources.length} resources
                    </span>
                    <span>{prettyEnum(module.type)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Link
                      href={`/admin/courses/${course?.id}/modules/${module.id}`}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      {t("modulesPage.openModule")}
                    </Link>
                    <button
                      onClick={() => openEditModule(module)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      {t("actions.edit")}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(module)}
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
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/70">
                <tr>
                  {[t("modulesPage.table.order"), t("modulesPage.table.title"), t("modulesPage.table.duration"), t("modulesPage.table.quiz"), t("modulesPage.table.actions")].map((heading) => (
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
                {sortedModules.map((module) => (
                  <tr key={module.id}>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {module.order}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-card-foreground">
                      {module.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {module.durationMinutes} min
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {module.hasQuiz ? t("modulesPage.quizYes") : t("modulesPage.quizNo")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/courses/${course?.id}/modules/${module.id}`}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          {t("modulesPage.openModule")}
                        </Link>
                        <button
                          onClick={() => openEditModule(module)}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          {t("actions.edit")}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(module)}
                          className="rounded-lg border border-border p-1.5 text-destructive hover:bg-muted"
                          aria-label={t("actions.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-card-foreground">
                  {draft.title || t("modulesPage.newModule")}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleSaveModule()}
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
                  <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    <Image
                      src={draft.coverImage || "/assets/module_image.jpg"}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                  <label className="flex-1 cursor-pointer rounded-lg border border-border px-3 py-2.5 text-center text-sm font-semibold hover:bg-muted">
                    <span className="inline-flex items-center gap-2">
                      {uploading ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {t("modulesPage.fields.coverImage")}
                    </span>
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
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder={t("modulesPage.fields.title")}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={1}
                    value={draft.order}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        order: Number(event.target.value || 1),
                      }))
                    }
                    placeholder={t("modulesPage.fields.order")}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    value={draft.durationMinutes}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        durationMinutes: Number(event.target.value || 0),
                      }))
                    }
                    placeholder="Duration in minutes"
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>

                <select
                  value={draft.type}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      type: event.target.value as ModuleTypeValue,
                    }))
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {moduleTypes.map((type) => (
                    <option key={type} value={type}>
                      {prettyEnum(type)}
                    </option>
                  ))}
                </select>

                <textarea
                  value={draft.overview ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      overview: event.target.value,
                    }))
                  }
                  placeholder={t("modulesPage.fields.overview")}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />

                <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                  {t("modulesPage.fields.hasQuiz")}
                  <input
                    type="checkbox"
                    checked={draft.hasQuiz}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        hasQuiz: event.target.checked,
                        quiz: event.target.checked
                          ? current.quiz ?? { passingScore: 70, questions: [] }
                          : null,
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {previewModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-3xl rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-card-foreground">
                    {previewModule.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {previewModule.videoUrl || "No video attached yet."}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewModule(null)}
                  className="rounded-lg border border-border p-2 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {previewModule.videoUrl ? (
                <video
                  src={previewModule.videoUrl}
                  controls
                  className="mt-4 aspect-video w-full rounded-lg bg-black"
                />
              ) : (
                <div className="mt-4 flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted text-sm text-muted-foreground">
                  No uploaded video preview available.
                </div>
              )}
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
            onConfirm={() => void handleDeleteModule()}
          />
        )}
      </div>
    </AdminLayout>
  );
}
