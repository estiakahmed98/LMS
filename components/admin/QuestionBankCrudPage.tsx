"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  LibraryBig,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import QuestionBankImport from "@/components/admin/QuestionBankImport";
import { fetchCourses } from "@/lib/admin-course-client";
import type { AdminCourseSummary } from "@/lib/admin-course-types";
import {
  createBatch,
  createExamType,
  createInstitution,
  deleteBatch,
  deleteExamType,
  deleteInstitution,
  deleteQuestionPaper,
  fetchBatches,
  fetchExamTypes,
  fetchInstitutions,
  fetchQuestionPapers,
  updateBatch,
  updateExamType,
  updateInstitution,
} from "@/lib/question-bank-client";
import type {
  AdminBatch,
  AdminExamType,
  AdminInstitution,
  InstitutionTypeValue,
  QuestionPaperSummary,
} from "@/lib/question-bank-types";

type LookupKind = "institutions" | "batches" | "examTypes";
const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm";

export default function QuestionBankCrudPage() {
  const t = useTranslations("adminQuestionBankPage");
  const router = useRouter();
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [institutions, setInstitutions] = useState<AdminInstitution[]>([]);
  const [batches, setBatches] = useState<AdminBatch[]>([]);
  const [examTypes, setExamTypes] = useState<AdminExamType[]>([]);
  const [papers, setPapers] = useState<QuestionPaperSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState<LookupKind | null>(null);

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
      setNotice(
        error instanceof Error ? error.message : t("notices.loadError"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    void loadLookups().catch((error) =>
      setNotice(
        error instanceof Error ? error.message : t("notices.loadError"),
      ),
    );
  }, [loadLookups, t]);
  useEffect(() => {
    void loadPapers();
  }, [loadPapers]);

  async function remove(paper: QuestionPaperSummary) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await deleteQuestionPaper(paper.id);
      await loadPapers();
      setNotice(t("notices.deleted"));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : t("notices.deleteError"),
      );
    }
  }

  const filteredPapers = papers.filter((paper) =>
    paper.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="space-y-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("summary", { count: papers.length })}
            </p>
            {notice && <p className="mt-1 text-sm text-primary">{notice}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 rounded-lg border px-4 py-2"
            >
              <Upload size={16} />
              {t("actions.importPdf")}
            </button>
            <button
              onClick={() => router.push("/admin/question-bank/papers/new")}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            >
              <Plus size={16} />
              {t("actions.addQuestion")}
            </button>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5" size={17} />
              <input
                className={`${inputClass} w-full pl-9`}
                placeholder={t("filters.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <button
              className="text-primary"
              onClick={() => setLookupOpen("institutions")}
            >
              {t("manage.institutions")}
            </button>
            <button
              className="text-primary"
              onClick={() => setLookupOpen("batches")}
            >
              {t("manage.batches")}
            </button>
            <button
              className="text-primary"
              onClick={() => setLookupOpen("examTypes")}
            >
              {t("manage.examTypes")}
            </button>
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
                className="cursor-pointer rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-sm"
                onClick={() =>
                  router.push(`/admin/question-bank/papers/${paper.id}`)
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{paper.title}</h3>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void remove(paper);
                    }}
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
              </div>
            ))}
          </div>
        )}
      </div>
      {importOpen && (
        <QuestionBankImport
          courses={courses}
          batches={batches}
          examTypes={examTypes}
          institutions={institutions}
          onClose={() => setImportOpen(false)}
          onChanged={() => void loadPapers()}
        />
      )}
      {lookupOpen && (
        <LookupManager
          kind={lookupOpen}
          courses={courses}
          institutions={institutions}
          batches={batches}
          examTypes={examTypes}
          onClose={() => setLookupOpen(null)}
          onChanged={loadLookups}
        />
      )}
    </AdminLayout>
  );
}

interface ManagerProps {
  kind: LookupKind;
  courses: AdminCourseSummary[];
  institutions: AdminInstitution[];
  batches: AdminBatch[];
  examTypes: AdminExamType[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}
function LookupManager({
  kind,
  courses,
  institutions,
  batches,
  examTypes,
  onClose,
  onChanged,
}: ManagerProps) {
  const [name, setName] = useState("");
  const [institutionType, setInstitutionType] =
    useState<InstitutionTypeValue>("OTHER");
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");
  const rows =
    kind === "institutions"
      ? institutions
      : kind === "batches"
        ? batches
        : examTypes;
  async function add() {
    try {
      if (kind === "institutions")
        await createInstitution({ name, type: institutionType });
      else if (kind === "batches")
        await createBatch({ name, courseId: courseId || null });
      else await createExamType({ name });
      setName("");
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save lookup.",
      );
    }
  }
  async function rename(row: AdminInstitution | AdminBatch | AdminExamType) {
    const next = window.prompt("New name", row.name);
    if (!next) return;
    try {
      if (kind === "institutions")
        await updateInstitution(row.id, {
          name: next,
          type: (row as AdminInstitution).type,
        });
      else if (kind === "batches")
        await updateBatch(row.id, {
          name: next,
          courseId: (row as AdminBatch).courseId,
        });
      else await updateExamType(row.id, { name: next });
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not rename lookup.",
      );
    }
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this lookup value?")) return;
    try {
      if (kind === "institutions") await deleteInstitution(id);
      else if (kind === "batches") await deleteBatch(id);
      else await deleteExamType(id);
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not delete lookup.",
      );
    }
  }
  return (
    <div className="fixed inset-0 z-60 bg-black/60 p-4">
      <div className="mx-auto mt-16 max-w-lg rounded-xl bg-card p-6">
        <div className="mb-4 flex justify-between">
          <h2 className="text-xl font-semibold">
            Manage {kind === "examTypes" ? "exam types" : kind}
          </h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className={`${inputClass} flex-1`}
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {kind === "institutions" && (
            <select
              className={inputClass}
              value={institutionType}
              onChange={(e) =>
                setInstitutionType(e.target.value as InstitutionTypeValue)
              }
            >
              <option value="SCHOOL">School</option>
              <option value="COLLEGE">College</option>
              <option value="UNIVERSITY">University</option>
              <option value="OTHER">Other</option>
            </select>
          )}
          {kind === "batches" && (
            <select
              className={inputClass}
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Any course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          )}
          <button
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            disabled={!name.trim()}
            onClick={() => void add()}
          >
            Add
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-4 max-h-80 divide-y overflow-y-auto rounded-lg border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between p-3">
              <span>{row.name}</span>
              <div className="flex gap-3">
                <button
                  className="text-primary"
                  onClick={() => void rename(row)}
                >
                  Rename
                </button>
                <button
                  className="text-destructive"
                  onClick={() => void remove(row.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
