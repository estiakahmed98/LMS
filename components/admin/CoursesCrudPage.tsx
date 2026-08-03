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
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const courseStatuses: CourseStatusValue[] = ["PUBLISHED", "DRAFT", "ARCHIVED"];
const PAGE_SIZE = 9;
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

function normalizeDraft(draft: AdminCoursePayload): AdminCoursePayload {
  const durationHours = Number(draft.durationHours);

  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
    categoryName: draft.categoryName.trim(),
    coverImage: draft.coverImage?.trim() || null,
    durationHours:
      Number.isFinite(durationHours) && durationHours >= 1
        ? Math.round(durationHours)
        : 1,
  };
}

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

function getVisiblePages(currentPage: number, totalPages: number) {
  const visibleCount = Math.min(5, totalPages);
  const start = Math.min(
    Math.max(1, currentPage - Math.floor(visibleCount / 2)),
    Math.max(1, totalPages - visibleCount + 1),
  );

  return Array.from({ length: visibleCount }, (_, index) => start + index);
}

export default function CoursesCrudPage() {
  const t = useTranslations("adminCoursesPage");
  const tAdmin = useTranslations("admin");
  const { can } = useAdminPermissions();
  const pathname = usePathname();
  const coursesPath = pathname.startsWith("/instructor")
    ? "/instructor/courses"
    : "/admin/courses";
  const canCreate = can("COURSES", "create");
  const canEdit = can("COURSES", "edit");
  const canDelete = can("COURSES", "delete");
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [draft, setDraft] = useState<AdminCoursePayload>(emptyDraft);
  const normalizedDraft = normalizeDraft(draft);
  const canSaveDraft =
    normalizedDraft.title.length > 0 &&
    normalizedDraft.description.length > 0 &&
    normalizedDraft.durationHours >= 1;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState(t("notice.loading"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | CourseStatusValue
  >("ALL");
  const [levelFilter, setLevelFilter] = useState<"ALL" | CourseLevelValue>(
    "ALL",
  );
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminCourseSummary | null>(
    null,
  );

  function label(key: string, fallback: string, values?: Record<string, string>) {
    return t.has(key) ? t(key, values) : fallback;
  }

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          courses
            .map((course) => course.categoryName)
            .filter((category): category is string => Boolean(category)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [courses],
  );

  const filteredCourses = useMemo(() => {
    const searchTerms = query
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return courses.filter((course) => {
      const searchableText = [
        course.title,
        course.description,
        course.categoryName ?? "",
        prettyEnum(course.status),
        prettyEnum(course.level),
      ]
        .join(" ")
        .toLocaleLowerCase();

      return (
        searchTerms.every((term) => searchableText.includes(term)) &&
        (statusFilter === "ALL" || course.status === statusFilter) &&
        (levelFilter === "ALL" || course.level === levelFilter) &&
        (categoryFilter === "ALL" ||
          course.categoryName === categoryFilter)
      );
    });
  }, [courses, query, statusFilter, levelFilter, categoryFilter]);

  const hasActiveFilters =
    Boolean(query.trim()) ||
    statusFilter !== "ALL" ||
    levelFilter !== "ALL" ||
    categoryFilter !== "ALL";

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedCourses = useMemo(
    () =>
      filteredCourses.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredCourses, currentPage],
  );
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const firstVisibleCourse =
    filteredCourses.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastVisibleCourse = Math.min(
    currentPage * PAGE_SIZE,
    filteredCourses.length,
  );

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setLevelFilter("ALL");
    setCategoryFilter("ALL");
    setPage(1);
  }

  async function loadCourses() {
    try {
      setLoading(true);
      const data = await fetchCourses();
      setCourses(data);
      setNotice(data.length ? t("notice.loaded") : t("notice.empty"));
    } catch (error) {
      setNotice(t("notice.loadError"));
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
      // Some existing rows predate the "at least 1 hour" rule (or were edited
      // directly), so clamp here rather than reopening the editor with a 0
      // that then fails validation with no visible cause.
      durationHours: course.durationHours >= 1 ? course.durationHours : 1,
      level: course.level,
      categoryName: course.categoryName ?? "",
      status: course.status,
      coverImage: course.coverImage,
    });
    setNotice(t("notice.editing", { title: course.title }));
    setIsEditorOpen(true);
  }

  async function handleSaveCourse() {
    if (!canSaveDraft) {
      setNotice(t("notice.titleRequired"));
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateCourse(editingId, normalizedDraft);
        setNotice(t("notice.saved"));
      } else {
        await createCourse(normalizedDraft);
        setNotice(t("notice.saved"));
      }
      setIsEditorOpen(false);
      await loadCourses();
    } catch (error) {
      // Surface the server's actual reason (e.g. "Duration hours must be at
      // least 1.") instead of a generic message that hides why it failed.
      setNotice(error instanceof Error ? error.message : t("notice.saveError"));
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
      setNotice(t("notice.deleteError"));
    }
  }

  async function handleCoverUpload(file: File) {
    try {
      setUploading(true);
      const upload = await uploadAdminFile(file, "courses");
      setDraft((current) => ({ ...current, coverImage: upload.url }));
      setNotice(t("notice.uploaded", { name: upload.name }));
    } catch (error) {
      setNotice(t("notice.uploadError"));
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
          {canCreate && (
            <button
              onClick={openNewCourse}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              {t("actions.newCourse")}
            </button>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_repeat(3,minmax(10rem,0.45fr))_auto]">
            <label className="relative block">
              <span className="sr-only">
                {label("filters.searchLabel", "Search courses")}
              </span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={label(
                  "filters.searchPlaceholder",
                  "Search by title, description, or category...",
                )}
                className="h-10 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value as "ALL" | CourseStatusValue,
                );
                setPage(1);
              }}
              aria-label={label("filters.statusLabel", "Filter by status")}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">
                {label("filters.allStatuses", "All statuses")}
              </option>
              {courseStatuses.map((status) => (
                <option key={status} value={status}>
                  {prettyEnum(status)}
                </option>
              ))}
            </select>

            <select
              value={levelFilter}
              onChange={(event) => {
                setLevelFilter(event.target.value as "ALL" | CourseLevelValue);
                setPage(1);
              }}
              aria-label={label("filters.levelLabel", "Filter by level")}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">
                {label("filters.allLevels", "All levels")}
              </option>
              {courseLevels.map((level) => (
                <option key={level} value={level}>
                  {prettyEnum(level)}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
              aria-label={label("filters.categoryLabel", "Filter by category")}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">
                {label("filters.allCategories", "All categories")}
              </option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              {label("filters.clear", "Clear")}
            </button>
          </div>

          {!loading && courses.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
              {label(
                "filters.showing",
                `Showing ${filteredCourses.length} of ${courses.length} courses`,
                {
                  shown: String(filteredCourses.length),
                  total: String(courses.length),
                },
              )}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card">
            <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {t("notice.empty")}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <Search className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {label(
                "filters.noMatches",
                "No courses match the current search and filters.",
              )}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-semibold text-primary hover:underline"
            >
              {label("filters.clearFilters", "Clear filters")}
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedCourses.map((course) => (
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
                        {course.categoryName || t("courseCard.uncategorized")}
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
                      href={`${coursesPath}/${course.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      {t("actions.viewModules")}
                    </Link>
                    {canEdit && (
                      <button
                        onClick={() => openEditCourse(course)}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        {t("actions.edit")}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteTarget(course)}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("actions.delete")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </div>

            <nav
              aria-label={label("pagination.label", "Course pagination")}
              className="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row"
            >
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {label(
                  "pagination.summary",
                  `Showing ${firstVisibleCourse}-${lastVisibleCourse} of ${filteredCourses.length}`,
                  {
                    from: String(firstVisibleCourse),
                    to: String(lastVisibleCourse),
                    total: String(filteredCourses.length),
                  },
                )}
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  aria-label={label("pagination.previous", "Previous page")}
                  className="flex h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {label("pagination.previousShort", "Previous")}
                  </span>
                </button>

                {visiblePages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    aria-label={label(
                      "pagination.goToPage",
                      `Go to page ${pageNumber}`,
                      { page: String(pageNumber) },
                    )}
                    aria-current={
                      pageNumber === currentPage ? "page" : undefined
                    }
                    className={`h-9 min-w-9 rounded-lg border px-2 text-sm font-semibold transition ${
                      pageNumber === currentPage
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label={label("pagination.next", "Next page")}
                  className="flex h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="hidden sm:inline">
                    {label("pagination.nextShort", "Next")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </nav>
          </>
        )}

        {(canCreate || canEdit) && isEditorOpen && (
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
                    disabled={saving || !canSaveDraft}
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

                <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                  {t("editor.fields.courseTitle")}
                  <input
                    required
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder={t("editor.fields.courseTitle")}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                  {t("editor.fields.description")}
                  <textarea
                    required
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder={t("editor.fields.description")}
                    rows={4}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    {t("editor.fields.categoryName")}
                    <input value={draft.categoryName} onChange={(event) => setDraft((current) => ({ ...current, categoryName: event.target.value }))} placeholder={t("editor.fields.categoryName")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    {t("editor.fields.durationHours")}
                    <input required type="number" min={1} value={draft.durationHours} onChange={(event) => setDraft((current) => ({ ...current, durationHours: Number(event.target.value || 1) }))} placeholder={t("editor.fields.durationHours")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    Level
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
                  </label>

                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    Status
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
                  </label>
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
