"use client";

import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import { courseRecords } from "@/lib/admin-panel-data";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, Layers, Plus, Save, Trash2, Users, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Course = (typeof courseRecords)[number];
type CourseStatus = Course["status"];
type CourseCategory = Course["category"];

const courseStatuses: CourseStatus[] = ["Published", "Draft", "Archived"];
const courseCategories: CourseCategory[] = [
  "Healthcare",
  "Human Resources",
  "Public Health",
  "Emergency Care",
];

function statusClass(status: string) {
  if (status === "Published")
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "Draft")
    return "border-yellow-200 bg-yellow-50 text-yellow-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const emptyCourse: Course = {
  id: "",
  title: "",
  category: "Healthcare",
  enrolled: 0,
  status: "Draft",
  description: "",
  modules: [],
};

export default function CoursesCrudPage() {
  const t = useTranslations("adminCoursesPage");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);
  const [courses, setCourses] = useState<Course[]>(courseRecords);
  const [draft, setDraft] = useState<Course>(emptyCourse);
  const [notice, setNotice] = useState(t("notice.ready"));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  function getStatusLabel(status: CourseStatus) {
    switch (status) {
      case "Published":
        return t("status.published");
      case "Draft":
        return t("status.draft");
      case "Archived":
        return t("status.archived");
    }
  }

  function getCategoryLabel(category: CourseCategory) {
    switch (category) {
      case "Healthcare":
        return t("categories.healthcare");
      case "Human Resources":
        return t("categories.humanResources");
      case "Public Health":
        return t("categories.publicHealth");
      case "Emergency Care":
        return t("categories.emergencyCare");
    }
  }

  function openNewCourse() {
    setDraft({ ...emptyCourse, modules: [] });
    setNotice(t("notice.newDraftReady"));
    setIsEditorOpen(true);
  }

  function openEditCourse(course: Course) {
    setDraft({ ...course });
    setNotice(t("notice.editing", { title: course.title }));
    setIsEditorOpen(true);
  }

  function saveCourse() {
    if (!draft.title.trim()) {
      setNotice(t("notice.titleRequired"));
      return;
    }

    setCourses((current) => {
      const exists = current.some((course) => course.id === draft.id);
      if (exists) {
        return current.map((course) =>
          course.id === draft.id ? draft : course,
        );
      }
      const id = draft.id || slugify(draft.title) || `course-${current.length + 1}`;
      return [{ ...draft, id }, ...current];
    });
    setNotice(t("notice.saved"));
    setIsEditorOpen(false);
  }

  function deleteCourse(course: Course) {
    setCourses((current) => current.filter((item) => item.id !== course.id));
    setNotice(t("notice.deleted"));
    setDeleteTarget(null);
  }

  return (
    <AdminLayout title={tAdmin("courses")}>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="relative aspect-video w-full bg-muted">
                <Image
                  src="/assets/courses.png"
                  alt={course.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {getCategoryLabel(course.category)}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-card-foreground">
                      {course.title}
                    </h2>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(course.status)}`}
                  >
                    {getStatusLabel(course.status)}
                  </span>
                </div>

                <p className="mt-3 flex-1 text-sm text-muted-foreground">
                  {course.description}
                </p>

                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {t("courseCard.enrolled", {
                      count: numberFormatter.format(course.enrolled),
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    {t("courseCard.moduleCount", {
                      count: numberFormatter.format(course.modules.length),
                    })}
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

        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-5">
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
                    onClick={saveCourse}
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
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                  placeholder={t("editor.fields.courseTitle")}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
                <select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      category: event.target.value as CourseCategory,
                    })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {courseCategories.map((category) => (
                    <option key={category} value={category}>
                      {getCategoryLabel(category)}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      status: event.target.value as CourseStatus,
                    })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {courseStatuses.map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                  placeholder={t("editor.fields.description")}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
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
            onConfirm={() => deleteCourse(deleteTarget)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
