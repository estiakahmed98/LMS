"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, LibraryBig, LoaderCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { fetchCourse, fetchCourses } from "@/lib/admin-course-client";
import type { AdminCourseSummary, AdminModuleDetail } from "@/lib/admin-course-types";
import {
  createQuestionPaper,
  deleteQuestionPaper,
  fetchBatches,
  fetchExamTypes,
  fetchInstitutions,
  fetchQuestionPapers,
} from "@/lib/question-bank-client";
import type {
  AdminBatch,
  AdminExamType,
  AdminInstitution,
  QuestionPaperSummary,
} from "@/lib/question-bank-types";

const IMPORT_PDF_ENABLED = false;

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm";

interface Filters {
  courseId: string;
  moduleId: string;
  batchId: string;
  examTypeId: string;
  institutionId: string;
  examYear: string;
  type: string;
}

const emptyFilters: Filters = {
  courseId: "",
  moduleId: "",
  batchId: "",
  examTypeId: "",
  institutionId: "",
  examYear: "",
  type: "",
};

export default function QuestionBankCrudPage() {
  const t = useTranslations("adminQuestionBankPage");
  const router = useRouter();
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [modules, setModules] = useState<AdminModuleDetail[]>([]);
  const [institutions, setInstitutions] = useState<AdminInstitution[]>([]);
  const [batches, setBatches] = useState<AdminBatch[]>([]);
  const [examTypes, setExamTypes] = useState<AdminExamType[]>([]);
  const [papers, setPapers] = useState<QuestionPaperSummary[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [newPaperOpen, setNewPaperOpen] = useState(false);

  const loadLookups = useCallback(async () => {
    const [courseData, institutionData, batchData, examTypeData] =
      await Promise.all([
        fetchCourses(),
        fetchInstitutions(),
        fetchBatches(),
        fetchExamTypes(),
      ]);
    setCourses(courseData);
    setInstitutions(institutionData);
    setBatches(batchData);
    setExamTypes(examTypeData);
  }, []);
  const loadPapers = useCallback(async () => {
    try {
      setLoading(true);
      setPapers(await fetchQuestionPapers());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("notices.loadError"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    void loadLookups().catch((error) =>
      toast.error(
        error instanceof Error ? error.message : t("notices.loadError"),
      ),
    );
  }, [loadLookups, t]);
  useEffect(() => {
    void loadPapers();
  }, [loadPapers]);
  useEffect(() => {
    if (!filters.courseId) {
      setModules([]);
      return;
    }
    void fetchCourse(filters.courseId)
      .then((course) => setModules(course.modules))
      .catch(() => setModules([]));
  }, [filters.courseId]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "courseId" ? { moduleId: "" } : {}),
    }));
  }

  async function remove(paper: QuestionPaperSummary) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await deleteQuestionPaper(paper.id);
      await loadPapers();
      toast.success(t("notices.deleted"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("notices.deleteError"),
      );
    }
  }

  const filteredPapers = papers.filter((paper) => {
    if (
      search.trim() &&
      !paper.title.toLowerCase().includes(search.trim().toLowerCase())
    )
      return false;
    if (filters.courseId && paper.courseId !== filters.courseId) return false;
    if (filters.moduleId && paper.moduleId !== filters.moduleId) return false;
    if (filters.batchId && paper.batchId !== filters.batchId) return false;
    if (filters.examTypeId && paper.examTypeId !== filters.examTypeId)
      return false;
    if (
      filters.institutionId &&
      paper.institutionId !== filters.institutionId
    )
      return false;
    if (filters.examYear && String(paper.examYear ?? "") !== filters.examYear)
      return false;
    return true;
  });

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="space-y-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("summary", { count: papers.length })}
            </p>
          </div>
          <div className="flex gap-2">
            {IMPORT_PDF_ENABLED && (
              <button className="flex items-center gap-2 rounded-lg border px-4 py-2">
                {t("actions.importPdf")}
              </button>
            )}
            <button
              onClick={() => setNewPaperOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            >
              <Plus size={16} />
              {t("actions.addQuestion")}
            </button>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <label className="relative block">
            <Search className="absolute left-3 top-2.5" size={17} />
            <input
              className={`${inputClass} w-full pl-9`}
              placeholder={t("filters.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("filters.allTypes")}
              <select
                className={`${inputClass} mt-1 w-full`}
                value={filters.type}
                onChange={(e) => setFilter("type", e.target.value)}
              >
                <option value="">{t("filters.allTypes")}</option>
                <option value="MCQ">MCQ</option>
                <option value="WRITTEN">Written</option>
                <option value="PRACTICAL">Practical</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("filters.allInstitutions")}
              <select
                className={`${inputClass} mt-1 w-full`}
                value={filters.institutionId}
                onChange={(e) => setFilter("institutionId", e.target.value)}
              >
                <option value="">{t("filters.allInstitutions")}</option>
                {institutions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("filters.allCourses")}
              <select
                className={`${inputClass} mt-1 w-full`}
                value={filters.courseId}
                onChange={(e) => setFilter("courseId", e.target.value)}
              >
                <option value="">{t("filters.allCourses")}</option>
                {courses.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("filters.allModules")}
              <select
                className={`${inputClass} mt-1 w-full`}
                value={filters.moduleId}
                onChange={(e) => setFilter("moduleId", e.target.value)}
              >
                <option value="">{t("filters.allModules")}</option>
                {modules.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("filters.allBatches")}
              <select
                className={`${inputClass} mt-1 w-full`}
                value={filters.batchId}
                onChange={(e) => setFilter("batchId", e.target.value)}
              >
                <option value="">{t("filters.allBatches")}</option>
                {batches.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("filters.allExamTypes")}
              <select
                className={`${inputClass} mt-1 w-full`}
                value={filters.examTypeId}
                onChange={(e) => setFilter("examTypeId", e.target.value)}
              >
                <option value="">{t("filters.allExamTypes")}</option>
                {examTypes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("filters.examYear")}
              <input
                className={`${inputClass} mt-1 w-full`}
                type="number"
                placeholder={t("filters.examYear")}
                value={filters.examYear}
                onChange={(e) => setFilter("examYear", e.target.value)}
              />
            </label>
            <div className="flex items-end">
              <button
                className="w-full rounded-lg border px-3 py-2 text-sm"
                onClick={() => {
                  setFilters(emptyFilters);
                  setSearch("");
                }}
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="rounded-xl border p-10 text-center">
            {t("loading")}
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="rounded-xl border p-10 text-center">
            <LibraryBig className="mx-auto mb-3" />
            <p>{t("empty")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPapers.map((paper) => (
              <div
                key={paper.id}
                className="rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{paper.title}</h3>
                  <button
                    onClick={() => void remove(paper)}
                    aria-label={t("actions.delete")}
                    className="text-destructive"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    paper.courseTitle,
                    paper.moduleTitle,
                    paper.batchName,
                    paper.examTypeName,
                    paper.institutionName,
                    paper.examYear,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                <div className="mt-3 flex gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                    {t("paperCard.questionCount", {
                      count: paper.questionCount,
                    })}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1">
                    {t("paperCard.totalMarks", { marks: paper.totalMarks })}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() =>
                      router.push(`/admin/question-bank/papers/${paper.id}`)
                    }
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted"
                  >
                    <Eye size={14} />
                    {t("actions.view")}
                  </button>
                  <button
                    onClick={() =>
                      router.push(`/admin/question-bank/papers/${paper.id}`)
                    }
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Pencil size={14} />
                    {t("actions.edit")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {newPaperOpen && (
        <NewPaperModal
          onClose={() => setNewPaperOpen(false)}
          onCreated={(id) => router.push(`/admin/question-bank/papers/${id}`)}
        />
      )}
    </AdminLayout>
  );
}

function NewPaperModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (paperId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [titleMissing, setTitleMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!title.trim()) {
      setTitleMissing(true);
      toast.error("Paper title is required.");
      return;
    }
    try {
      setSaving(true);
      const paper = await createQuestionPaper({
        title: title.trim(),
        courseId: null,
        moduleId: null,
        batchId: null,
        examTypeId: null,
        institutionId: null,
        examYear: null,
      });
      onCreated(paper.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create paper.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Question Paper</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label className="text-xs font-semibold text-muted-foreground">
          Paper title
          <input
            autoFocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) setTitleMissing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void create();
            }}
            placeholder="Paper title, e.g. Mid Term MCQ"
            className={`mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm ${titleMissing ? "border-destructive focus:outline-destructive" : "border-border"}`}
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => void create()}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving && <LoaderCircle size={14} className="animate-spin" />}
            Create &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
}
