"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Plus,
  Printer,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import QuestionBankAiImport from "@/components/admin/QuestionBankAiImport";
import QuestionBankOcrImport from "@/components/admin/QuestionBankOcrImport";
import { fetchCourse, fetchCourses } from "@/lib/admin-course-client";
import type {
  AdminCourseSummary,
  AdminModuleDetail,
} from "@/lib/admin-course-types";
import {
  createBatch,
  createExamType,
  createInstitution,
  createQuestionBankItem,
  createQuestionPaper,
  deleteQuestionBankItem,
  fetchBatches,
  fetchExamTypes,
  fetchInstitutions,
  fetchQuestionPaper,
  updateQuestionBankItem,
  updateQuestionPaper,
} from "@/lib/question-bank-client";
import type {
  AdminBatch,
  AdminExamType,
  AdminInstitution,
  QuestionBankItemPayload,
  QuestionBankItemSummary,
  QuestionPaperDetail,
} from "@/lib/question-bank-types";
import type {
  AdminExtractedQuestion,
  DifficultyValue,
  QuestionTypeValue,
} from "@/lib/admin-assessment-types";
import {
  CQ_PART_LABELS,
  cqTotalMarks,
  decodeCqParts,
  encodeCqParts,
  type CqPart,
} from "@/lib/question-bank-cq";

const difficultyOptions: DifficultyValue[] = ["EASY", "MEDIUM", "HARD"];
const optionLabels = ["A", "B", "C", "D", "E", "F"];
const EXAM_TYPE_SUGGESTIONS = [
  "Final Exam",
  "Midterm",
  "Board Exam",
  "BSC",
  "Model Test",
];
// Question Type is separate from Exam Type: MCQ / CQ (written, with
// uddipok + sub-questions) / Lab (practical).
const QUESTION_TYPE_OPTIONS: { value: QuestionTypeValue; label: string }[] = [
  { value: "MCQ", label: "MCQ" },
  { value: "WRITTEN", label: "CQ" },
  { value: "PRACTICAL", label: "Lab" },
];
const MCQ_FIRST_PRINT_PAGE_QUESTIONS = 8;
const MCQ_QUESTIONS_PER_PRINT_PAGE = 9;
const currentYear = new Date().getFullYear();

interface ComboOption {
  id: string;
  name: string;
}

function ComboSelect({
  label,
  value,
  options,
  placeholder,
  onSelect,
  onCreate,
  suggestions,
}: {
  label: string;
  value: string;
  options: ComboOption[];
  placeholder: string;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => Promise<ComboOption>;
  suggestions?: string[];
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(nameOverride?: string) {
    const finalName = (nameOverride ?? name).trim();
    if (!finalName) return;
    try {
      setSaving(true);
      const created = await onCreate(finalName);
      onSelect(created.id);
      setAdding(false);
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create.");
    } finally {
      setSaving(false);
    }
  }

  if (adding) {
    return (
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
        <div className="mt-1 flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
              if (e.key === "Escape") {
                setAdding(false);
                setName("");
              }
            }}
            placeholder={`New ${label.toLowerCase()} name`}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={() => void submit()}
            aria-label="Save"
            className="shrink-0 rounded-lg border border-border p-2 text-primary hover:bg-muted disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setName("");
            }}
            aria-label="Cancel"
            className="shrink-0 rounded-lg border border-border p-2 hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>
        {suggestions && suggestions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={saving}
                onClick={() => void submit(suggestion)}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium hover:border-primary hover:text-primary"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </label>
    );
  }

  return (
    <label className="text-xs font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === "__add__") {
            setAdding(true);
            return;
          }
          onSelect(e.target.value || null);
        }}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
        <option value="__add__">+ Add new...</option>
      </select>
    </label>
  );
}

export default function QuestionBankPaperPage({
  paperId,
}: {
  paperId: string | null;
}) {
  const t = useTranslations("adminQuestionBankPaperPage");
  const router = useRouter();
  const [paper, setPaper] = useState<QuestionPaperDetail | null>(null);
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [modules, setModules] = useState<AdminModuleDetail[]>([]);
  const [batches, setBatches] = useState<AdminBatch[]>([]);
  const [examTypes, setExamTypes] = useState<AdminExamType[]>([]);
  const [institutions, setInstitutions] = useState<AdminInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [specialInstructionsDraft, setSpecialInstructionsDraft] = useState("");
  const [fullMarksDraft, setFullMarksDraft] = useState("");
  const [questionsToAnswerDraft, setQuestionsToAnswerDraft] = useState("");
  const [titleMissing, setTitleMissing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [addQuestionType, setAddQuestionType] =
    useState<QuestionTypeValue>("MCQ");
  const [uploading, setUploading] = useState(false);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [courseData, batchData, examTypeData, institutionData] =
        await Promise.all([
          fetchCourses(),
          fetchBatches(),
          fetchExamTypes(),
          fetchInstitutions(),
        ]);
      setCourses(courseData);
      setBatches(batchData);
      setExamTypes(examTypeData);
      setInstitutions(institutionData);

      if (paperId) {
        const data = await fetchQuestionPaper(paperId);
        setPaper(data);
        setTitleDraft(data.title);
        setSpecialInstructionsDraft(data.specialInstructions ?? "");
        setFullMarksDraft(
          data.fullMarksOverride === null
            ? ""
            : String(data.fullMarksOverride),
        );
        setQuestionsToAnswerDraft(
          data.questionsToAnswer === null
            ? ""
            : String(data.questionsToAnswer),
        );
        if (data.courseId) {
          const course = await fetchCourse(data.courseId);
          setModules(course.modules);
        }
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveSettings() {
    if (!paper) return;
    if (!titleDraft.trim()) {
      setTitleMissing(true);
      toast.error("Paper title is required.");
      return;
    }
    try {
      setSavingSettings(true);
      const updated = await updateQuestionPaper(paper.id, {
        title: titleDraft.trim(),
        specialInstructions: specialInstructionsDraft.trim() || null,
        fullMarksOverride: fullMarksDraft ? Number(fullMarksDraft) : null,
        questionsToAnswer: questionsToAnswerDraft
          ? Number(questionsToAnswerDraft)
          : null,
        courseId: paper.courseId,
        moduleId: paper.moduleId,
        batchId: paper.batchId,
        examTypeId: paper.examTypeId,
        institutionId: paper.institutionId,
        examYear: paper.examYear,
      });
      setPaper({ ...paper, ...updated });
      toast.success("Saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleAddQuestion(type: QuestionTypeValue = "MCQ") {
    let activePaper = paper;
    if (!activePaper) {
      // A new paper draft: create it first with the drafted title.
      if (!titleDraft.trim()) {
        setTitleMissing(true);
        toast.error("Paper title is required.");
        return;
      }
      const created = await createQuestionPaper({
        title: titleDraft.trim(),
        specialInstructions: specialInstructionsDraft.trim() || null,
        courseId: null,
        moduleId: null,
        batchId: null,
        examTypeId: null,
        institutionId: null,
        examYear: null,
      });
      activePaper = { ...created, questions: [] };
      setPaper(activePaper);
      router.replace(`/admin/question-bank/papers/${created.id}`);
    }
    try {
      setAddingQuestion(true);
      const nextOrder = activePaper.questions.length;
      const isCq = type === "WRITTEN";
      const item = await createQuestionBankItem({
        type,
        question: isCq ? "Passage / উদ্দীপক" : "New question",
        options: isCq
          ? encodeCqParts(
              CQ_PART_LABELS.map((label) => ({ label, text: "", marks: 0 })),
            )
          : type === "MCQ"
            ? ["Option A", "Option B", "Option C", "Option D"]
            : [],
        correctAnswer: null,
        rubric: null,
        difficulty: "MEDIUM",
        marks: isCq ? 0 : 5,
        examYear: activePaper.examYear,
        status: "DRAFT",
        tags: [],
        courseId: activePaper.courseId,
        moduleId: activePaper.moduleId,
        batchId: activePaper.batchId,
        examTypeId: activePaper.examTypeId,
        institutionId: activePaper.institutionId,
        paperId: activePaper.id,
        order: nextOrder,
      });
      setPaper({
        ...activePaper,
        questions: [...activePaper.questions, item],
        questionCount: activePaper.questions.length + 1,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add question.",
      );
    } finally {
      setAddingQuestion(false);
    }
  }

  async function handleUpdateQuestion(
    questionId: string,
    payload: QuestionBankItemPayload,
  ) {
    if (!paper) return;
    try {
      setBusyQuestionId(questionId);
      const updated = await updateQuestionBankItem(questionId, {
        ...payload,
        paperId: paper.id,
      });
      setPaper({
        ...paper,
        questions: paper.questions.map((q) =>
          q.id === questionId ? updated : q,
        ),
        totalMarks:
          paper.fullMarksOverride ??
          paper.questions.reduce(
            (sum, q) =>
              sum + ((q.id === questionId ? updated.marks : q.marks) ?? 0),
            0,
          ),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save question.",
      );
    } finally {
      setBusyQuestionId(null);
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!paper) return;
    try {
      setBusyQuestionId(questionId);
      await deleteQuestionBankItem(questionId);
      const remainingQuestions = paper.questions.filter(
        (q) => q.id !== questionId,
      );
      setPaper({
        ...paper,
        questions: remainingQuestions,
        questionCount: paper.questionCount - 1,
        totalMarks:
          paper.fullMarksOverride ??
          remainingQuestions.reduce(
            (sum, question) => sum + (question.marks ?? 0),
            0,
          ),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete question.",
      );
    } finally {
      setBusyQuestionId(null);
    }
  }

  async function handleImportQuestions(extracted: AdminExtractedQuestion[]) {
    let activePaper = paper;
    if (!activePaper) {
      if (!titleDraft.trim()) {
        setTitleMissing(true);
        toast.error("Paper title is required.");
        throw new Error("Paper title is required.");
      }
      const created = await createQuestionPaper({
        title: titleDraft.trim(),
        specialInstructions: specialInstructionsDraft.trim() || null,
        courseId: null,
        moduleId: null,
        batchId: null,
        examTypeId: null,
        institutionId: null,
        examYear: null,
      });
      activePaper = { ...created, questions: [] };
      setPaper(activePaper);
      router.replace(`/admin/question-bank/papers/${created.id}`);
    }
    try {
      setUploading(true);
      const created: QuestionBankItemSummary[] = [];
      let order = activePaper.questions.length;
      for (const question of extracted) {
        const isCq = question.type === "WRITTEN" && question.cqParts;
        const item = await createQuestionBankItem({
          type: question.type,
          question: question.question,
          marks: isCq
            ? question.cqParts!.reduce(
                (sum, part) => sum + (part.marks || 0),
                0,
              )
            : question.marks || 5,
          options: isCq
            ? encodeCqParts(
                question.cqParts!.map((part) => ({
                  label: part.label as (typeof CQ_PART_LABELS)[number],
                  text: part.text,
                  marks: part.marks,
                })),
              )
            : (question.options ?? []),
          correctAnswer: question.correctAnswer,
          rubric: question.rubric,
          difficulty: question.difficulty ?? "MEDIUM",
          examYear: activePaper.examYear,
          status: "DRAFT",
          tags: [],
          courseId: activePaper.courseId,
          moduleId: activePaper.moduleId,
          batchId: activePaper.batchId,
          examTypeId: activePaper.examTypeId,
          institutionId: activePaper.institutionId,
          paperId: activePaper.id,
          order: order++,
        });
        created.push(item);
      }
      setPaper({
        ...activePaper,
        questions: [...activePaper.questions, ...created],
        questionCount: activePaper.questions.length + created.length,
      });
      toast.success(
        `Added ${created.length} question(s). Review before publishing.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import questions.",
      );
      throw error;
    } finally {
      setUploading(false);
    }
  }

  function handlePrint() {
    if (!paper) return;
    const previousTitle = document.title;
    document.title = paper.title;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  if (loading) {
    return (
      <AdminLayout title={t("pageTitle")}>
        <div className="flex items-center justify-center p-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (notFound) {
    return (
      <AdminLayout title={t("pageTitle")}>
        <div className="space-y-4 p-6">
          <Link
            href="/admin/question-bank"
            className="flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Question Bank
          </Link>
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Question paper not found.
          </div>
        </div>
      </AdminLayout>
    );
  }

  const questions = paper?.questions ?? [];
  const calculatedTotalMarks = questions.reduce(
    (sum, question) => sum + (question.marks ?? 0),
    0,
  );
  const displayedTotalMarks = fullMarksDraft
    ? Number(fullMarksDraft)
    : calculatedTotalMarks;
  const displayedQuestionCount = questionsToAnswerDraft
    ? Number(questionsToAnswerDraft)
    : questions.length;

  return (
    <AdminLayout title={t("pageTitle")}>
      {paper && <QuestionPaperPrintView paper={paper} />}
      <div className="space-y-6 p-6 print:hidden">
        <Link
          href="/admin/question-bank"
          className="flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Question Bank
        </Link>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_160px]">
            <label className="text-xs font-semibold text-muted-foreground">
              Paper title
              <input
                value={titleDraft}
                onChange={(event) => {
                  setTitleDraft(event.target.value);
                  if (event.target.value.trim()) setTitleMissing(false);
                }}
                placeholder="Paper title, e.g. Mid Term MCQ"
                className={`mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm ${titleMissing ? "border-destructive focus:outline-destructive" : "border-border"}`}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Course
              <select
                value={paper?.courseId ?? ""}
                disabled={!paper}
                onChange={async (event) => {
                  if (!paper) return;
                  const courseId = event.target.value || null;
                  setPaper({ ...paper, courseId, moduleId: null });
                  setModules(
                    courseId ? (await fetchCourse(courseId)).modules : [],
                  );
                }}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-50"
              >
                <option value="">No course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Module
              <select
                value={paper?.moduleId ?? ""}
                disabled={!paper}
                onChange={(event) =>
                  paper &&
                  setPaper({ ...paper, moduleId: event.target.value || null })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-50"
              >
                <option value="">No module</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <ComboSelect
              label="Batch"
              value={paper?.batchId ?? ""}
              options={batches.map((b) => ({ id: b.id, name: b.name }))}
              placeholder="No batch"
              onSelect={(id) => paper && setPaper({ ...paper, batchId: id })}
              onCreate={async (name) => {
                const created = await createBatch({
                  name,
                  courseId: paper?.courseId ?? null,
                });
                setBatches((current) => [...current, created]);
                return created;
              }}
            />
            <ComboSelect
              label="Exam type"
              value={paper?.examTypeId ?? ""}
              options={examTypes.map((e) => ({ id: e.id, name: e.name }))}
              placeholder="No exam type"
              suggestions={EXAM_TYPE_SUGGESTIONS.filter(
                (name) =>
                  !examTypes.some(
                    (e) => e.name.toLowerCase() === name.toLowerCase(),
                  ),
              )}
              onSelect={(id) => paper && setPaper({ ...paper, examTypeId: id })}
              onCreate={async (name) => {
                const created = await createExamType({ name });
                setExamTypes((current) => [...current, created]);
                return created;
              }}
            />
            <ComboSelect
              label="Institution"
              value={paper?.institutionId ?? ""}
              options={institutions.map((i) => ({ id: i.id, name: i.name }))}
              placeholder="No institution"
              onSelect={(id) =>
                paper && setPaper({ ...paper, institutionId: id })
              }
              onCreate={async (name) => {
                const created = await createInstitution({
                  name,
                  type: "OTHER",
                });
                setInstitutions((current) => [...current, created]);
                return created;
              }}
            />
            <label className="text-xs font-semibold text-muted-foreground">
              Exam year
              <input
                type="number"
                inputMode="numeric"
                min={1990}
                max={currentYear + 5}
                placeholder={String(currentYear)}
                value={paper?.examYear ?? ""}
                disabled={!paper}
                onChange={(event) =>
                  paper &&
                  setPaper({
                    ...paper,
                    examYear: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-50"
              />
            </label>
          </div>

          <label className="mt-4 block text-xs font-semibold text-muted-foreground">
            Special instructions
            <textarea
              value={specialInstructionsDraft}
              onChange={(event) =>
                setSpecialInstructionsDraft(event.target.value)
              }
              rows={3}
              placeholder="Write any instructions that should appear above the questions in the PDF."
              className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground"
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Full marks
              <input
                type="number"
                min={1}
                step={1}
                value={fullMarksDraft}
                onChange={(event) => setFullMarksDraft(event.target.value)}
                placeholder={`Automatic: ${calculatedTotalMarks}`}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground"
              />
              <span className="mt-1 block text-[11px] font-normal">
                Leave blank to calculate from all questions.
              </span>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Questions to answer
              <input
                type="number"
                min={1}
                max={questions.length || undefined}
                step={1}
                value={questionsToAnswerDraft}
                onChange={(event) =>
                  setQuestionsToAnswerDraft(event.target.value)
                }
                placeholder={`Automatic: ${questions.length}`}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground"
              />
              <span className="mt-1 block text-[11px] font-normal">
                For example, enter 3 when students answer any 3 questions.
              </span>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold">
              {t("summaryBar.totalMarks", { marks: displayedTotalMarks })}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold">
              {t("summaryBar.questionCount", {
                count: displayedQuestionCount,
              })}
            </div>
            <button
              onClick={() => void handleSaveSettings()}
              disabled={savingSettings || !paper}
              className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {savingSettings ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Settings
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-card-foreground">
              Questions
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={!paper || questions.length === 0}
                className="flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 hover:border-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Export Question Paper
              </button>
              <div
                role="group"
                aria-label="Question type"
                className="flex items-center overflow-hidden rounded-lg border border-border"
              >
                {QUESTION_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAddQuestionType(option.value)}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${
                      addQuestionType === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {/* AI Auto-fill and Upload & OCR follow the selected type
                  (MCQ or CQ); Lab questions are manual-entry only. The key
                  remounts the dialogs so samples/disclaimer match the type. */}
              {addQuestionType !== "PRACTICAL" && (
                <>
                  <QuestionBankAiImport
                    key={`ai-${addQuestionType}`}
                    disabled={uploading}
                    defaultType={addQuestionType}
                    onImport={handleImportQuestions}
                  />
                  <QuestionBankOcrImport
                    key={`ocr-${addQuestionType}`}
                    disabled={uploading}
                    defaultType={addQuestionType}
                    onImport={handleImportQuestions}
                  />
                </>
              )}
              <button
                onClick={() => void handleAddQuestion(addQuestionType)}
                disabled={addingQuestion}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {addingQuestion ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Question
              </button>
            </div>
          </div>

          <div className="divide-y divide-border">
            {questions.map((question, index) => (
              <QuestionRow
                key={question.id}
                index={index}
                question={question}
                disabled={busyQuestionId === question.id}
                onSave={(payload) =>
                  void handleUpdateQuestion(question.id, payload)
                }
                onDelete={() => setDeleteConfirmId(question.id)}
              />
            ))}
            {questions.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">
                No questions yet. Add one manually, paste with AI Auto-fill, or
                upload a PDF with Upload &amp; OCR.
              </p>
            )}
          </div>
        </section>
      </div>
      {deleteConfirmId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-card-foreground">
              Delete this question?
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This will permanently remove the question from this paper. This
              action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  void handleDeleteQuestion(id);
                }}
                className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function QuestionPaperPrintView({ paper }: { paper: QuestionPaperDetail }) {
  const totalMarks =
    paper.fullMarksOverride ??
    paper.questions.reduce(
      (sum, question) => sum + (question.marks ?? 0),
      0,
    );
  const questionsToAnswer =
    paper.questionsToAnswer ?? paper.questions.length;

  const metaItems = [
    paper.courseTitle && `Course: ${paper.courseTitle}`,
    paper.moduleTitle && `Module: ${paper.moduleTitle}`,
    paper.batchName && `Batch: ${paper.batchName}`,
    paper.examTypeName && `Exam: ${paper.examTypeName}`,
    paper.examYear && `Year: ${paper.examYear}`,
  ].filter(Boolean) as string[];

  // MCQ papers keep eight questions on the header-heavy first sheet and nine
  // on every following sheet. CQ content has a variable height, so it keeps
  // the browser's natural page flow and the print-page margin from globals.css.
  const isMcqPaper =
    paper.questions.length > 0 &&
    paper.questions.every((question) => question.type === "MCQ");
  const isCqPaper =
    paper.questions.length > 0 &&
    paper.questions.every((question) => question.type === "WRITTEN");
  const questionPages: QuestionBankItemSummary[][] = [];

  if (isMcqPaper) {
    questionPages.push(
      paper.questions.slice(0, MCQ_FIRST_PRINT_PAGE_QUESTIONS),
    );
    for (
      let index = MCQ_FIRST_PRINT_PAGE_QUESTIONS;
      index < paper.questions.length;
      index += MCQ_QUESTIONS_PER_PRINT_PAGE
    ) {
      questionPages.push(
        paper.questions.slice(index, index + MCQ_QUESTIONS_PER_PRINT_PAGE),
      );
    }
  } else {
    questionPages.push(paper.questions);
  }

  return (
    <div className="question-paper-print hidden bg-white text-black print:block print:p-6">
      {questionPages.map((pageQuestions, pageIndex) => (
        <section
          key={pageIndex}
          className={
            pageIndex === 0 ? "" : "print:break-before-page print:pt-[12mm]"
          }
        >
          {pageIndex === 0 && (
            <header className="border-b-2 border-black pb-3 text-center">
              {paper.institutionName && (
                <p className="text-2xl font-bold tracking-wide">
                  {paper.institutionName}
                </p>
              )}
              <h1 className="mt-1 text-lg font-semibold uppercase tracking-wider">
                {paper.title}
              </h1>
              {metaItems.length > 0 && (
                <p className="mt-2 text-sm">{metaItems.join("  |  ")}</p>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-black pt-2 text-sm font-semibold">
                <span>Full Marks: {totalMarks}</span>
                <span>Questions to Answer: {questionsToAnswer}</span>
              </div>
            </header>
          )}

          {pageIndex === 0 && paper.specialInstructions && (
            <div className="mt-4 pb-3 text-xs italic">
              <p className="text-xs">
                <span className="font-bold">Instructions:</span>{" "}
                {paper.specialInstructions}
              </p>
            </div>
          )}

          <ol
            className={`${pageIndex === 0 ? "mt-6" : ""} space-y-6 ${isCqPaper ? "cq-print-flow" : ""}`}
          >
            {pageQuestions.map((question, questionIndex) => (
              <li key={question.id} className="break-inside-avoid">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">
                    <span className="font-bold">
                      {pageIndex === 0
                        ? questionIndex + 1
                        : MCQ_FIRST_PRINT_PAGE_QUESTIONS +
                          (pageIndex - 1) * MCQ_QUESTIONS_PER_PRINT_PAGE +
                          questionIndex +
                          1}
                      .{" "}
                    </span>
                    {question.question}
                  </p>
                  <span className="shrink-0 whitespace-nowrap text-xs font-semibold">
                    [{question.marks ?? 0} marks]
                  </span>
                </div>

                {question.type === "MCQ" && question.options.length > 0 ? (
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 pl-6 text-sm">
                    {question.options.map((option, optionIndex) => (
                      <p key={optionIndex}>
                        {optionLabels[optionIndex] ?? optionIndex + 1}. {option}
                      </p>
                    ))}
                  </div>
                ) : question.type === "WRITTEN" ? (
                  <div className="mt-2 pl-6 text-sm">
                    <ol className="mt-2 space-y-3">
                      {decodeCqParts(question.options).map(
                        (part, partIndex) => (
                          <li
                            key={partIndex}
                            className="flex items-baseline gap-2"
                          >
                            <span className="font-semibold">{part.label}.</span>
                            <span className="flex-1">{part.text}</span>
                            <span className="shrink-0 whitespace-nowrap text-xs font-semibold">
                              [{part.marks} marks]
                            </span>
                          </li>
                        ),
                      )}
                    </ol>
                  </div>
                ) : (
                  <div className="mt-3 space-y-4 pl-6">
                    {Array.from({ length: 4 }).map((_, lineIndex) => (
                      <div
                        key={lineIndex}
                        className="border-b border-dotted border-black"
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function QuestionRow({
  index,
  question,
  disabled,
  onSave,
  onDelete,
}: {
  index: number;
  question: QuestionBankItemSummary;
  disabled: boolean;
  onSave: (payload: QuestionBankItemPayload) => void;
  onDelete: () => void;
}) {
  const [prompt, setPrompt] = useState(question.question);
  const [options, setOptions] = useState(question.options);
  const [correctAnswer, setCorrectAnswer] = useState(
    question.correctAnswer ?? "",
  );
  const [marks, setMarks] = useState(question.marks ?? 0);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [cqParts, setCqParts] = useState<CqPart[]>(() =>
    decodeCqParts(question.options),
  );

  useEffect(() => {
    setPrompt(question.question);
    setOptions(question.options);
    setCorrectAnswer(question.correctAnswer ?? "");
    setMarks(question.marks ?? 0);
    setDifficulty(question.difficulty);
    setCqParts(decodeCqParts(question.options));
  }, [question]);

  const isMcq = question.type === "MCQ";
  const isCq = question.type === "WRITTEN";

  function persist(patch: Partial<QuestionBankItemPayload> = {}) {
    onSave({
      type: question.type,
      question: prompt,
      marks: isCq ? cqTotalMarks(cqParts) : marks,
      options: isCq ? encodeCqParts(cqParts) : options,
      correctAnswer: isMcq ? correctAnswer.trim() || null : null,
      rubric: question.rubric,
      difficulty,
      examYear: question.examYear,
      status: question.status,
      tags: question.tags,
      courseId: question.courseId,
      moduleId: question.moduleId,
      batchId: question.batchId,
      examTypeId: question.examTypeId,
      institutionId: question.institutionId,
      ...patch,
    });
  }

  function persistCqParts(nextParts: CqPart[]) {
    setCqParts(nextParts);
    onSave({
      type: question.type,
      question: prompt,
      marks: cqTotalMarks(nextParts),
      options: encodeCqParts(nextParts),
      correctAnswer: null,
      rubric: question.rubric,
      difficulty,
      examYear: question.examYear,
      status: question.status,
      tags: question.tags,
      courseId: question.courseId,
      moduleId: question.moduleId,
      batchId: question.batchId,
      examTypeId: question.examTypeId,
      institutionId: question.institutionId,
    });
  }

  return (
    <article className="p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">
          Q{index + 1}
        </span>
        <span className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {QUESTION_TYPE_OPTIONS.find((o) => o.value === question.type)
            ?.label ?? question.type}
        </span>
        <label className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold">
          Difficulty
          <select
            value={difficulty}
            onChange={(event) => {
              const next = event.target.value as DifficultyValue;
              setDifficulty(next);
            }}
            onBlur={() => persist()}
            className="bg-transparent text-xs font-semibold outline-none"
          >
            {difficultyOptions.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0) + item.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>

        {isCq ? (
          <span className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold">
            Marks: {cqTotalMarks(cqParts)} (auto)
          </span>
        ) : (
          <label className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold">
            Marks
            <input
              type="number"
              min={0}
              value={marks}
              onChange={(event) => setMarks(Number(event.target.value))}
              onBlur={() => persist()}
              className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-xs"
            />
          </label>
        )}

        <button
          onClick={onDelete}
          disabled={disabled}
          className="ml-auto rounded-lg border border-border p-2 text-destructive hover:bg-muted disabled:opacity-60"
          aria-label="Delete question"
        >
          {disabled ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {isCq && (
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          উদ্দীপক (Passage)
        </label>
      )}
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onBlur={() => persist()}
        rows={isCq ? 4 : 2}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium"
      />

      {isMcq && (
        <div className="mt-3 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            {options.map((option, optionIndex) => (
              <label
                key={optionIndex}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name={`${question.id}-correct`}
                  checked={correctAnswer === option}
                  onChange={() => {
                    setCorrectAnswer(option);
                    persist({ correctAnswer: option });
                  }}
                />
                <input
                  value={option}
                  onChange={(event) => {
                    const next = [...options];
                    next[optionIndex] = event.target.value;
                    setOptions(next);
                  }}
                  onBlur={() => persist()}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {isCq && (
        <div className="mt-3 space-y-2">
          {cqParts.map((part, partIndex) => (
            <div
              key={partIndex}
              className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2"
            >
              <span className="mt-2 shrink-0 text-sm font-semibold">
                {part.label}.
              </span>
              <textarea
                value={part.text}
                onChange={(event) => {
                  const next = [...cqParts];
                  next[partIndex] = { ...part, text: event.target.value };
                  setCqParts(next);
                }}
                onBlur={() => persistCqParts(cqParts)}
                rows={2}
                placeholder={`${part.label} প্রশ্ন লিখুন`}
                className="w-full flex-1 resize-none bg-transparent text-sm outline-none"
              />
              <label className="mt-1 flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground">
                Marks
                <input
                  type="number"
                  min={0}
                  value={part.marks}
                  onChange={(event) => {
                    const next = [...cqParts];
                    next[partIndex] = {
                      ...part,
                      marks: Number(event.target.value),
                    };
                    setCqParts(next);
                  }}
                  onBlur={() => persistCqParts(cqParts)}
                  className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
