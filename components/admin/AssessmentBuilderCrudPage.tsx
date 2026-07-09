"use client"

import AdminLayout from "@/components/AdminLayout"
import {
  createQuestion,
  deleteQuestion,
  extractQuestionsFromFile,
  fetchAssessment,
  updateAssessment,
  updateQuestion,
} from "@/lib/admin-assessment-client"
import type {
  AdminAssessmentDetail,
  AdminQuestionPayload,
  DifficultyValue,
  QuestionTypeValue,
} from "@/lib/admin-assessment-types"
import { useTranslations } from "next-intl"
import {
  ArrowLeft,
  Clock,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

function getTypeLabel(type: QuestionTypeValue | "MIXED") {
  switch (type) {
    case "MCQ":
      return "MCQ"
    case "WRITTEN":
      return "Written"
    case "PRACTICAL":
      return "Practical"
    case "MIXED":
      return "Mixed"
  }
}

const difficultyOptions: DifficultyValue[] = ["EASY", "MEDIUM", "HARD"]

export default function AssessmentBuilderCrudPage() {
  const t = useTranslations("adminAssessmentBuilderPage")
  const searchParams = useSearchParams()
  const assessmentId = searchParams.get("assessmentId")
  const isViewOnly = searchParams.get("mode") === "view"

  const [assessment, setAssessment] = useState<AdminAssessmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [notice, setNotice] = useState("")
  const [savingSettings, setSavingSettings] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null)

  const [titleDraft, setTitleDraft] = useState("")
  const [passingMarksDraft, setPassingMarksDraft] = useState("0")

  async function loadAssessment() {
    if (!assessmentId) {
      setNotFound(true)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await fetchAssessment(assessmentId)
      setAssessment(data)
      setTitleDraft(data.title)
      setPassingMarksDraft(String(data.passingMarks))
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAssessment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId])

  const totalMarks = assessment?.questions.reduce((sum, q) => sum + (q.marks || 0), 0) ?? 0
  const totalTimeMinutes =
    assessment?.questions.reduce((sum, q) => sum + (q.timeLimitMinutes || 0), 0) ?? 0

  async function handleSaveSettings() {
    if (!assessment) return
    try {
      setSavingSettings(true)
      const updated = await updateAssessment(assessment.id, {
        courseId: assessment.courseId,
        title: titleDraft.trim() || assessment.title,
        type: assessment.type,
        totalMarks,
        passingMarks: Number(passingMarksDraft) || 0,
      })
      setAssessment(updated)
      setNotice("Assessment settings saved.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save settings.")
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleAddQuestion() {
    if (!assessment) return
    try {
      setAddingQuestion(true)
      const payload: AdminQuestionPayload = {
        type: assessment.type === "MIXED" ? "MCQ" : (assessment.type as QuestionTypeValue),
        question: "New question",
        marks: 5,
        options:
          assessment.type === "WRITTEN" || assessment.type === "PRACTICAL"
            ? []
            : ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: null,
        rubric: null,
        difficulty: "MEDIUM",
        timeLimitMinutes: 2,
      }
      const updated = await createQuestion(assessment.id, payload)
      setAssessment(updated)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to add question.")
    } finally {
      setAddingQuestion(false)
    }
  }

  async function handleUpdateQuestion(questionId: string, payload: AdminQuestionPayload) {
    if (!assessment) return
    try {
      setBusyQuestionId(questionId)
      const updated = await updateQuestion(assessment.id, questionId, payload)
      setAssessment(updated)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save question.")
    } finally {
      setBusyQuestionId(null)
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!assessment) return
    try {
      setBusyQuestionId(questionId)
      const updated = await deleteQuestion(assessment.id, questionId)
      setAssessment(updated)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to delete question.")
    } finally {
      setBusyQuestionId(null)
    }
  }

  async function handleUploadExtract(file: File) {
    if (!assessment) return
    try {
      setUploading(true)
      setNotice("Extracting questions from file…")
      const extracted = await extractQuestionsFromFile(file)
      if (extracted.length === 0) {
        setNotice("No questions could be extracted from that file.")
        return
      }
      let updated = assessment
      for (const question of extracted) {
        updated = await createQuestion(assessment.id, {
          type: question.type,
          question: question.question,
          marks: question.marks || 5,
          options: question.options ?? [],
          correctAnswer: question.correctAnswer,
          rubric: question.rubric,
          difficulty: question.difficulty ?? "MEDIUM",
          timeLimitMinutes: 2,
        })
      }
      setAssessment(updated)
      setNotice(`Added ${extracted.length} question(s) from upload. Review answers before saving.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to extract questions.")
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title={t("pageTitle")}>
        <div className="flex items-center justify-center p-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    )
  }

  if (notFound || !assessment) {
    return (
      <AdminLayout title={t("pageTitle")}>
        <div className="space-y-4 p-6">
          <Link
            href="/admin/assessments"
            className="flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Assessment not found.
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="space-y-6 p-6">
        <Link
          href="/admin/assessments"
          className="flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {getTypeLabel(assessment.type)}
            </span>
            <span className="ml-auto text-sm text-muted-foreground">{notice}</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_220px_140px]">
            <input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              placeholder={t("fields.assessmentTitle")}
              disabled={isViewOnly}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-70"
            />
            <input
              value={assessment.courseTitle}
              disabled
              className="rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground"
            />
            <input
              value={passingMarksDraft}
              onChange={(event) => setPassingMarksDraft(event.target.value)}
              type="number"
              min={0}
              disabled={isViewOnly}
              placeholder={t("fields.passMark")}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-70"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold">
              {t("summaryBar.totalMarks", { marks: totalMarks })}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              {t("summaryBar.totalTime", { minutes: totalTimeMinutes })}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold">
              {t("summaryBar.questionCount", { count: assessment.questions.length })}
            </div>
            {!isViewOnly && (
              <button
                onClick={() => void handleSaveSettings()}
                disabled={savingSettings}
                className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {savingSettings ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Settings
              </button>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                {t("questionBuilder.title")}
              </h2>
            </div>
            {!isViewOnly && (
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                  {uploading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload &amp; Auto-fill
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void handleUploadExtract(file)
                      event.target.value = ""
                    }}
                  />
                </label>
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
                  {t("questionBuilder.addQuestion")}
                </button>
              </div>
            )}
          </div>

          <div className="divide-y divide-border">
            {assessment.questions.map((question, questionIndex) => (
              <QuestionRow
                key={question.id}
                index={questionIndex}
                question={question}
                disabled={isViewOnly || busyQuestionId === question.id}
                onSave={(payload) => void handleUpdateQuestion(question.id, payload)}
                onDelete={() => void handleDeleteQuestion(question.id)}
                readOnly={isViewOnly}
              />
            ))}
            {assessment.questions.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No questions yet.</p>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}

function QuestionRow({
  index,
  question,
  disabled,
  readOnly,
  onSave,
  onDelete,
}: {
  index: number
  question: AdminAssessmentDetail["questions"][number]
  disabled: boolean
  readOnly: boolean
  onSave: (payload: AdminQuestionPayload) => void
  onDelete: () => void
}) {
  const [prompt, setPrompt] = useState(question.question)
  const [options, setOptions] = useState(question.options)
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer ?? "")
  const [rubric, setRubric] = useState(question.rubric ?? "")
  const [marks, setMarks] = useState(question.marks)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(question.timeLimitMinutes ?? 0)
  const [difficulty, setDifficulty] = useState(question.difficulty)

  useEffect(() => {
    setPrompt(question.question)
    setOptions(question.options)
    setCorrectAnswer(question.correctAnswer ?? "")
    setRubric(question.rubric ?? "")
    setMarks(question.marks)
    setTimeLimitMinutes(question.timeLimitMinutes ?? 0)
    setDifficulty(question.difficulty)
  }, [question])

  function persist(patch: Partial<AdminQuestionPayload> = {}) {
    onSave({
      type: question.type,
      question: prompt,
      marks,
      options,
      correctAnswer: correctAnswer.trim() || null,
      rubric: rubric.trim() || null,
      difficulty,
      timeLimitMinutes,
      ...patch,
    })
  }

  const isMcq = question.type === "MCQ"

  return (
    <article className="p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">
          Q{index + 1}
        </span>
        <select
          value={difficulty}
          disabled={readOnly}
          onChange={(event) => {
            const next = event.target.value as DifficultyValue
            setDifficulty(next)
          }}
          onBlur={() => persist()}
          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold disabled:opacity-70"
        >
          {difficultyOptions.map((item) => (
            <option key={item} value={item}>
              {item.charAt(0) + item.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold">
          Marks
          <input
            type="number"
            min={0}
            value={marks}
            disabled={readOnly}
            onChange={(event) => setMarks(Number(event.target.value))}
            onBlur={() => persist()}
            className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-xs disabled:opacity-70"
          />
        </label>

        <label className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          Time
          <input
            type="number"
            min={0}
            value={timeLimitMinutes}
            disabled={readOnly}
            onChange={(event) => setTimeLimitMinutes(Number(event.target.value))}
            onBlur={() => persist()}
            className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-xs disabled:opacity-70"
          />
          min
        </label>

        {!readOnly && (
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
        )}
      </div>

      <textarea
        value={prompt}
        disabled={readOnly}
        onChange={(event) => setPrompt(event.target.value)}
        onBlur={() => persist()}
        rows={2}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium disabled:opacity-70"
      />

      {isMcq ? (
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
                  disabled={readOnly}
                  onChange={() => {
                    setCorrectAnswer(option)
                    persist({ correctAnswer: option })
                  }}
                />
                <input
                  value={option}
                  disabled={readOnly}
                  onChange={(event) => {
                    const next = [...options]
                    const previousValue = next[optionIndex]
                    next[optionIndex] = event.target.value
                    setOptions(next)
                    if (correctAnswer === previousValue) {
                      setCorrectAnswer(event.target.value)
                    }
                  }}
                  onBlur={() => persist({ options })}
                  className="w-full bg-transparent outline-none disabled:opacity-70"
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Select the radio button next to the correct option.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-semibold text-muted-foreground">
            Model answer / correct answer
          </label>
          <textarea
            value={correctAnswer}
            disabled={readOnly}
            onChange={(event) => setCorrectAnswer(event.target.value)}
            onBlur={() => persist()}
            rows={2}
            placeholder="Enter the correct / expected answer"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-70"
          />
          <label className="block text-xs font-semibold text-muted-foreground">
            Grading rubric
          </label>
          <textarea
            value={rubric}
            disabled={readOnly}
            onChange={(event) => setRubric(event.target.value)}
            onBlur={() => persist()}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-70"
          />
        </div>
      )}
    </article>
  )
}
