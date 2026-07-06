"use client";

import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import {
  courseRecords,
  type AdminCourseModule,
} from "@/lib/admin-panel-data";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Clock,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Plus,
  Save,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Course = (typeof courseRecords)[number];
type ViewMode = "grid" | "list";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function emptyModule(order: number): AdminCourseModule {
  return {
    id: "",
    order,
    title: "",
    duration: "",
    coverImage: "/assets/module_image.jpg",
    videoUrl: "",
    overview: "",
    hasQuiz: false,
    watchTimeMinutes: 0,
    viewCount: 0,
    notes: [],
    resources: [],
    quiz: { passingScore: 70, questions: [] },
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
  const [courses, setCourses] = useState<Course[]>(courseRecords);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draft, setDraft] = useState<AdminCourseModule>(emptyModule(1));
  const [deleteTarget, setDeleteTarget] = useState<AdminCourseModule | null>(
    null,
  );
  const [notice, setNotice] = useState(t("notice.ready"));

  const course = courses.find((item) => item.id === courseId);

  if (!course) {
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

  function openNewModule() {
    setDraft(emptyModule((course?.modules.length ?? 0) + 1));
    setNotice(t("notice.newDraftReady"));
    setIsEditorOpen(true);
  }

  function openEditModule(module: AdminCourseModule) {
    setDraft({ ...module });
    setNotice(t("notice.editing", { title: module.title }));
    setIsEditorOpen(true);
  }

  function saveModule() {
    if (!draft.title.trim()) {
      setNotice(t("notice.titleRequired"));
      return;
    }
    setCourses((current) =>
      current.map((item) => {
        if (item.id !== courseId) return item;
        const exists = item.modules.some((m) => m.id === draft.id);
        if (exists) {
          return {
            ...item,
            modules: item.modules.map((m) =>
              m.id === draft.id ? draft : m,
            ),
          };
        }
        const id =
          draft.id || `${slugify(item.id)}-${slugify(draft.title)}`;
        return { ...item, modules: [...item.modules, { ...draft, id }] };
      }),
    );
    setNotice(t("notice.saved"));
    setIsEditorOpen(false);
  }

  function deleteModule(module: AdminCourseModule) {
    setCourses((current) =>
      current.map((item) =>
        item.id === courseId
          ? {
              ...item,
              modules: item.modules.filter((m) => m.id !== module.id),
            }
          : item,
      ),
    );
    setNotice(t("notice.deleted"));
    setDeleteTarget(null);
  }

  const sortedModules = [...course.modules].sort((a, b) => a.order - b.order);

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
              {course.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{notice}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border p-1">
              <button
                onClick={() => setViewMode("grid")}
                aria-label={t("modulesPage.gridView")}
                className={`rounded-md p-1.5 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-label={t("modulesPage.listView")}
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

        {viewMode === "grid" ? (
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
                      {module.duration || "—"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      {t("modulesPage.resourceCount", {
                        count: module.resources.length,
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Timer className="h-4 w-4" />
                      {t("modulesPage.watchTime", {
                        minutes: module.watchTimeMinutes,
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      {t("modulesPage.viewCount", {
                        count: module.viewCount,
                      })}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Link
                    href={`/admin/courses/${course.id}/modules/${module.id}`}
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
                  {[
                    t("modulesPage.table.order"),
                    t("modulesPage.table.title"),
                    t("modulesPage.table.duration"),
                    t("modulesPage.table.quiz"),
                    t("modulesPage.table.actions"),
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
                {sortedModules.map((module) => (
                  <tr key={module.id}>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {module.order}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-card-foreground">
                      {module.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {module.duration || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {module.hasQuiz
                        ? t("modulesPage.quizYes")
                        : t("modulesPage.quizNo")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/courses/${course.id}/modules/${module.id}`}
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
            <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-card-foreground">
                  {draft.title || t("modulesPage.newModule")}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveModule}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    <Save className="h-4 w-4" />
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
                    {t("modulesPage.fields.coverImage")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () =>
                          setDraft((current) => ({
                            ...current,
                            coverImage: reader.result as string,
                          }));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                  placeholder={t("modulesPage.fields.title")}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={draft.order}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        order: Number(event.target.value),
                      })
                    }
                    type="number"
                    min={1}
                    placeholder={t("modulesPage.fields.order")}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                  <input
                    value={draft.duration}
                    onChange={(event) =>
                      setDraft({ ...draft, duration: event.target.value })
                    }
                    placeholder={t("modulesPage.fields.duration")}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={draft.watchTimeMinutes}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        watchTimeMinutes: Number(event.target.value),
                      })
                    }
                    type="number"
                    min={0}
                    placeholder={t("modulesPage.fields.watchTime")}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                  <input
                    value={draft.viewCount}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        viewCount: Number(event.target.value),
                      })
                    }
                    type="number"
                    min={0}
                    placeholder={t("modulesPage.fields.viewCount")}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <textarea
                  value={draft.overview}
                  onChange={(event) =>
                    setDraft({ ...draft, overview: event.target.value })
                  }
                  placeholder={t("modulesPage.fields.overview")}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
                <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                  {t("modulesPage.fields.hasQuiz")}
                  <input
                    type="checkbox"
                    checked={draft.hasQuiz}
                    onChange={(event) =>
                      setDraft({ ...draft, hasQuiz: event.target.checked })
                    }
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <StudentConfirmModal
            title={t("modulesPage.confirm.deleteTitle")}
            description={t("modulesPage.confirm.deleteDescription", {
              title: deleteTarget.title,
            })}
            confirmLabel={t("confirm.deleteConfirm")}
            cancelLabel={t("confirm.cancel")}
            danger
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => deleteModule(deleteTarget)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
