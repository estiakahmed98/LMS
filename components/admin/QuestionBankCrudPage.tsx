"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  LibraryBig,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
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
const DEFAULT_BASE_PATH = "/admin/question-bank";

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm";

function ExamYearPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (year: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const selectedYear = Number(value) || currentYear;
  const [open, setOpen] = useState(false);
  const [decadeStart, setDecadeStart] = useState(
    Math.floor(selectedYear / 10) * 10,
  );
  const years = Array.from({ length: 12 }, (_, index) => decadeStart - 1 + index);

  function selectYear(year: number) {
    onChange(String(year));
    setOpen(false);
  }

  return (
    <div className="relative">
      <span className="text-xs font-semibold text-muted-foreground">
        Exam year
      </span>
      <button
        type="button"
        onClick={() => {
          setDecadeStart(Math.floor(selectedYear / 10) * 10);
          setOpen((current) => !current);
        }}
        className={`${inputClass} mt-1 flex w-full items-center justify-between gap-2 text-left`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {value || "Any year"}
        </span>
        <CalendarDays size={16} className="shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close year picker"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Select exam year"
            className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous decade"
                onClick={() => setDecadeStart((year) => year - 10)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <ChevronLeft size={17} />
              </button>
              <span className="text-sm font-semibold">
                {decadeStart}–{decadeStart + 9}
              </span>
              <button
                type="button"
                aria-label="Next decade"
                onClick={() => setDecadeStart((year) => year + 10)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => selectYear(year)}
                  className={`rounded-lg px-2 py-2 text-sm transition-colors ${
                    value === String(year)
                      ? "bg-primary font-semibold text-primary-foreground"
                      : year === currentYear
                        ? "bg-primary/10 font-semibold text-primary hover:bg-primary/20"
                        : "hover:bg-muted"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              Any year
            </button>
          </div>
        </>
      )}
    </div>
  );
}

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

interface QuestionBankCrudPageProps {
  basePath?: string;
  canEdit?: boolean;
  useAdminLayout?: boolean;
}

export default function QuestionBankCrudPage(
  props: QuestionBankCrudPageProps = {},
) {
  return <QuestionBankCrudPageContent {...props} />;
}

function QuestionBankCrudPageContent({
  basePath = DEFAULT_BASE_PATH,
  canEdit = true,
  useAdminLayout = true,
}: QuestionBankCrudPageProps = {}) {
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
  const [deleteTarget, setDeleteTarget] =
    useState<QuestionPaperSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function remove() {
    if (!canEdit) return;
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteQuestionPaper(deleteTarget.id);
      await loadPapers();
      setDeleteTarget(null);
      toast.success(t("notices.deleted"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("notices.deleteError"),
      );
    } finally {
      setDeleting(false);
    }
  }

  const filteredPapers = papers.filter((paper) => {
    const searchTerms = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    if (searchTerms.length > 0) {
      const questionTypeSearchText = paper.questionTypes
        .flatMap((type) =>
          type === "WRITTEN" ? [type, "CQ", "Written"] : [type],
        )
        .join(" ");
      const searchableText = [
        paper.title,
        paper.specialInstructions,
        questionTypeSearchText,
        paper.institutionName,
        paper.courseTitle,
        paper.moduleTitle,
        paper.batchName,
        paper.examTypeName,
        paper.examYear,
        paper.questionCount,
        `${paper.questionCount} questions`,
        paper.totalMarks,
        `${paper.totalMarks} marks`,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLocaleLowerCase();

      if (!searchTerms.every((term) => searchableText.includes(term))) {
        return false;
      }
    }
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
    if (
      filters.type &&
      !paper.questionTypes.includes(
        filters.type as QuestionPaperSummary["questionTypes"][number],
      )
    )
      return false;
    return true;
  });

  const page = (
    <>
      <div className="space-y-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("summary", { count: papers.length })}
            </p>
          </div>
          <div className="flex gap-2">
            {canEdit && IMPORT_PDF_ENABLED && (
              <button className="flex items-center gap-2 rounded-lg border px-4 py-2">
                {t("actions.importPdf")}
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setNewPaperOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
              >
                <Plus size={16} />
                {t("actions.addQuestion")}
              </button>
            )}
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
              Question type
              <select
                className={`${inputClass} mt-1 w-full`}
                value={filters.type}
                onChange={(e) => setFilter("type", e.target.value)}
              >
                <option value="">{t("filters.allTypes")}</option>
                <option value="MCQ">MCQ</option>
                <option value="WRITTEN">CQ</option>
                <option value="PRACTICAL">Practical</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Institution
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
              Course
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
              Module
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
              Batch
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
              Exam type
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
            <ExamYearPicker
              value={filters.examYear}
              onChange={(year) => setFilter("examYear", year)}
            />
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
                    onClick={() => setDeleteTarget(paper)}
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
                      count: paper.questionsToAnswer ?? paper.questionCount,
                    })}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1">
                    {t("paperCard.totalMarks", { marks: paper.totalMarks })}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() =>
                      router.push(`${basePath}/papers/${paper.id}`)
                    }
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted"
                  >
                    <Eye size={14} />
                    {t("actions.view")}
                  </button>
                  {canEdit && (
                    <button
                      onClick={() =>
                        router.push(`${basePath}/papers/${paper.id}`)
                      }
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <Pencil size={14} />
                      {t("actions.edit")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {canEdit && newPaperOpen && (
        <NewPaperModal
          onClose={() => setNewPaperOpen(false)}
          onCreated={(id) => router.push(`${basePath}/papers/${id}`)}
        />
      )}
      {canEdit && deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-paper-title"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="delete-paper-title" className="text-lg font-semibold">
                  {t("actions.delete")}: {deleteTarget.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("confirmDelete")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                aria-label="Close"
                className="rounded-lg p-1 hover:bg-muted disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
              >
                {deleting ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {t("actions.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return useAdminLayout ? (
    <AdminLayout title={t("pageTitle")}>{page}</AdminLayout>
  ) : (
    page
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
  const [specialInstructions, setSpecialInstructions] = useState("");
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
        specialInstructions: specialInstructions.trim() || null,
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
        <label className="mt-4 block text-xs font-semibold text-muted-foreground">
          Special instructions
          <textarea
            value={specialInstructions}
            onChange={(event) => setSpecialInstructions(event.target.value)}
            rows={4}
            placeholder="Instructions shown above the questions in the PDF"
            className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground"
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
