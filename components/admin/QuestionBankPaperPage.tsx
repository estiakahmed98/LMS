"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LoaderCircle,
  Plus,
  Printer,
  Save,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import QuestionBankAiImport from "@/components/admin/QuestionBankAiImport";
import QuestionBankOcrImport from "@/components/admin/QuestionBankOcrImport";
import { fetchCourse, fetchCourses } from "@/lib/admin-course-client";
import type { AdminCourseSummary, AdminModuleDetail } from "@/lib/admin-course-types";
import {
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
} from "@/lib/admin-assessment-types";

const difficultyOptions: DifficultyValue[] = ["EASY", "MEDIUM", "HARD"];
const optionLabels = ["A", "B", "C", "D", "E", "F"];

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
  const [titleMissing, setTitleMissing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);

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

  async function handleAddQuestion() {
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
      const item = await createQuestionBankItem({
        type: "MCQ",
        question: "New question",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: null,
        rubric: null,
        difficulty: "MEDIUM",
        marks: 5,
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
        totalMarks: paper.questions.reduce(
          (sum, q) => sum + ((q.id === questionId ? updated.marks : q.marks) ?? 0),
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
    if (!window.confirm("Delete this question?")) return;
    try {
      setBusyQuestionId(questionId);
      await deleteQuestionBankItem(questionId);
      setPaper({
        ...paper,
        questions: paper.questions.filter((q) => q.id !== questionId),
        questionCount: paper.questionCount - 1,
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
        const item = await createQuestionBankItem({
          type: question.type,
          question: question.question,
          marks: question.marks || 5,
          options: question.options ?? [],
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
      toast.success(`Added ${created.length} question(s). Review before publishing.`);
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
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks ?? 0), 0);
  const defaultType = questions[0]?.type ?? "MCQ";

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

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <label className="text-xs font-semibold text-muted-foreground">
              Batch
              <select
                value={paper?.batchId ?? ""}
                disabled={!paper}
                onChange={(event) =>
                  paper &&
                  setPaper({ ...paper, batchId: event.target.value || null })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-50"
              >
                <option value="">No batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Exam type
              <select
                value={paper?.examTypeId ?? ""}
                disabled={!paper}
                onChange={(event) =>
                  paper &&
                  setPaper({ ...paper, examTypeId: event.target.value || null })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-50"
              >
                <option value="">No exam type</option>
                {examTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Institution
              <select
                value={paper?.institutionId ?? ""}
                disabled={!paper}
                onChange={(event) =>
                  paper &&
                  setPaper({
                    ...paper,
                    institutionId: event.target.value || null,
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-50"
              >
                <option value="">No institution</option>
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold">
              {t("summaryBar.totalMarks", { marks: totalMarks })}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold">
              {t("summaryBar.questionCount", { count: questions.length })}
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
                className="flex items-center gap-2 rounded-lg border border-secondary px-3 py-2 text-sm font-semibold text-secondary hover:bg-secondary hover:text-secondary-foreground disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Export Question Paper
              </button>
              <QuestionBankAiImport
                disabled={uploading}
                defaultType={defaultType}
                onImport={handleImportQuestions}
              />
              <QuestionBankOcrImport
                disabled={uploading}
                defaultType={defaultType}
                onImport={handleImportQuestions}
              />
              <button
                onClick={() => void handleAddQuestion()}
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
                onDelete={() => void handleDeleteQuestion(question.id)}
              />
            ))}
            {questions.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">
                No questions yet. Add one manually, paste with AI Auto-fill,
                or upload a PDF with Upload &amp; OCR.
              </p>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function QuestionPaperPrintView({ paper }: { paper: QuestionPaperDetail }) {
  const totalMarks = paper.questions.reduce(
    (sum, q) => sum + (q.marks ?? 0),
    0,
  );

  return (
    <div className="question-paper-print hidden bg-white text-black print:block print:p-6">
      <header className="border-b-2 border-black pb-4 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          {paper.title}
        </h1>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span>Full Marks: {totalMarks}</span>
          {paper.examYear && <span>Year: {paper.examYear}</span>}
        </div>
      </header>

      <div className="mt-4 flex items-center justify-between border-b border-black pb-2 text-sm">
        <span>Name: _______________________________</span>
        <span>Roll No: ______________</span>
        <span>Date: __________</span>
      </div>

      <p className="mt-4 text-sm italic">
        Instructions: Answer all questions. Write your answers clearly in the
        space provided.
      </p>

      <ol className="mt-6 space-y-6">
        {paper.questions.map((question, index) => (
          <li key={question.id} className="break-inside-avoid">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">
                <span className="font-bold">{index + 1}. </span>
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
            ) : (
              <div className="mt-3 space-y-4 pl-6">
                {Array.from({
                  length: question.type === "PRACTICAL" ? 4 : 3,
                }).map((_, lineIndex) => (
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

  useEffect(() => {
    setPrompt(question.question);
    setOptions(question.options);
    setCorrectAnswer(question.correctAnswer ?? "");
    setMarks(question.marks ?? 0);
    setDifficulty(question.difficulty);
  }, [question]);

  const isMcq = question.type === "MCQ";

  function persist(patch: Partial<QuestionBankItemPayload> = {}) {
    onSave({
      type: question.type,
      question: prompt,
      marks,
      options,
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

  return (
    <article className="p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">
          Q{index + 1}
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

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onBlur={() => persist()}
        rows={2}
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
    </article>
  );
}
