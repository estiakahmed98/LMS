"use client"

import AdminLayout from "@/components/AdminLayout"
import { assessmentQuestionSet } from "@/lib/admin-panel-data"
import { useTranslations } from "next-intl"
import { CalendarClock, ClipboardList, FilePenLine, FlaskConical, Plus, Save, Shuffle, Trash2 } from "lucide-react"
import { useState } from "react"

type Question = {
  id: string
  difficulty: string
  prompt: string
  options: string[]
  rubric: string
}

type ModeId = "mcq" | "writtenExam" | "practiceQuiz" | "practicalLab"

const modes: Array<{ id: ModeId; icon: typeof ClipboardList }> = [
  { id: "mcq", icon: ClipboardList },
  { id: "writtenExam", icon: FilePenLine },
  { id: "practiceQuiz", icon: Shuffle },
  { id: "practicalLab", icon: FlaskConical },
]

const modules = ["Community Paramedic", "HR & Recruitment", "Public Health Essentials"] as const

function rawModeLabel(mode: ModeId) {
  switch (mode) {
    case "mcq":
      return "MCQ"
    case "writtenExam":
      return "Written Exam"
    case "practiceQuiz":
      return "Practice Quiz"
    case "practicalLab":
      return "Practical / Lab"
  }
}

export default function AssessmentBuilderCrudPage() {
  const t = useTranslations("adminAssessmentBuilderPage")

  function getModeLabel(mode: ModeId) {
    switch (mode) {
      case "mcq":
        return t("modes.mcq")
      case "writtenExam":
        return t("modes.writtenExam")
      case "practiceQuiz":
        return t("modes.practiceQuiz")
      case "practicalLab":
        return t("modes.practicalLab")
    }
  }

  function getModuleLabel(moduleName: (typeof modules)[number]) {
    switch (moduleName) {
      case "Community Paramedic":
        return t("modules.communityParamedic")
      case "HR & Recruitment":
        return t("modules.hrRecruitment")
      case "Public Health Essentials":
        return t("modules.publicHealthEssentials")
    }
  }

  function getDifficultyLabel(difficulty: string) {
    switch (difficulty) {
      case "Easy":
        return t("difficulty.easy")
      case "Medium":
        return t("difficulty.medium")
      case "Hard":
        return t("difficulty.hard")
      default:
        return difficulty
    }
  }

  function getInitialQuestions(): Question[] {
    return assessmentQuestionSet.map((question) => ({
      id: `q-${question.number}`,
      difficulty: question.difficulty,
      prompt: t(`questions.q${question.number}.prompt`),
      options: [
        t(`questions.q${question.number}.options.a`),
        t(`questions.q${question.number}.options.b`),
        t(`questions.q${question.number}.options.c`),
        t(`questions.q${question.number}.options.d`),
      ],
      rubric: t("questionBuilder.rubricDefault"),
    }))
  }

  function getGeneratedPrompt(mode: ModeId) {
    if (mode === "mcq" || mode === "practiceQuiz") {
      return t("questionBuilder.newQuestionPrompt")
    }

    return t("questionBuilder.newRubricPrompt")
  }

  const [mode, setMode] = useState<ModeId>("mcq")
  const [title, setTitle] = useState(`${rawModeLabel("mcq")} - Module 4`)
  const [moduleName, setModuleName] = useState<(typeof modules)[number]>("Community Paramedic")
  const [passMark, setPassMark] = useState("70%")
  const [timeLimit, setTimeLimit] = useState("30m")
  const [questions, setQuestions] = useState<Question[]>(() => getInitialQuestions())
  const [savedAssessments, setSavedAssessments] = useState<string[]>([])
  const [notice, setNotice] = useState(t("notice.ready"))

  function addQuestion() {
    setQuestions((current) => [
      ...current,
      {
        id: `q-${Date.now()}`,
        difficulty: "Medium",
        prompt: getGeneratedPrompt(mode),
        options: [t("questionBuilder.optionA"), t("questionBuilder.optionB"), t("questionBuilder.optionC"), t("questionBuilder.optionD")],
        rubric: t("questionBuilder.addRubric"),
      },
    ])
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((current) => current.map((question) => (question.id === id ? { ...question, ...patch } : question)))
  }

  function saveAssessment() {
    const label = t("savedDraft.label", {
      title,
      mode: getModeLabel(mode),
      count: questions.length,
    })
    setSavedAssessments((current) => [label, ...current])
    setNotice(t("notice.saved"))
  }

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {modes.map((item) => {
              const Icon = item.icon
              const active = mode === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setMode(item.id)
                    setTitle(`${rawModeLabel(item.id)} - Module 4`)
                    setNotice(t("notice.tabActive", { mode: getModeLabel(item.id) }))
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {getModeLabel(item.id)}
                </button>
              )
            })}
            <span className="ml-auto text-sm text-muted-foreground">{notice}</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_220px_120px_120px]">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("fields.assessmentTitle")}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <select value={moduleName} onChange={(event) => setModuleName(event.target.value as (typeof modules)[number])} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              {modules.map((item) => (
                <option key={item} value={item}>
                  {getModuleLabel(item)}
                </option>
              ))}
            </select>
            <input value={passMark} onChange={(event) => setPassMark(event.target.value)} placeholder={t("fields.passMark")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            <input value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} placeholder={t("fields.timeLimit")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">{t("questionBuilder.title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("questionBuilder.summary", {
                    module: getModuleLabel(moduleName),
                    passMark,
                    timeLimit,
                  })}
                </p>
              </div>
              <button onClick={addQuestion} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" />
                {t("questionBuilder.addQuestion")}
              </button>
            </div>

            <div className="divide-y divide-border">
              {questions.map((question, questionIndex) => (
                <article key={question.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">
                      {t("questionBuilder.questionBadge", { number: questionIndex + 1 })}
                    </span>
                    <select value={question.difficulty} onChange={(event) => updateQuestion(question.id, { difficulty: event.target.value })} className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold">
                      <option value="Easy">{getDifficultyLabel("Easy")}</option>
                      <option value="Medium">{getDifficultyLabel("Medium")}</option>
                      <option value="Hard">{getDifficultyLabel("Hard")}</option>
                    </select>
                    <button
                      onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}
                      className="ml-auto rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                      aria-label={t("questionBuilder.deleteQuestion")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <textarea value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium" />

                  {mode === "mcq" || mode === "practiceQuiz" ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <label key={`${question.id}-${optionIndex}`} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                          <input name={question.id} type="radio" defaultChecked={optionIndex === 1} />
                          <input
                            value={option}
                            onChange={(event) => {
                              const next = [...question.options]
                              next[optionIndex] = event.target.value
                              updateQuestion(question.id, { options: next })
                            }}
                            className="w-full bg-transparent outline-none"
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea value={question.rubric} onChange={(event) => updateQuestion(question.id, { rubric: event.target.value })} rows={3} className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  )}
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-semibold text-card-foreground">{t("settings.title")}</h2>
            {[t("settings.randomizeQuestions"), t("settings.showAnswers"), t("settings.requireAuditNote")].map((label, index) => (
              <label key={label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                {label}
                <input type="checkbox" defaultChecked={index !== 1} />
              </label>
            ))}
            <input defaultValue="2" type="number" placeholder={t("settings.maxAttempts")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>{t("settings.grading.autoGraded")}</option>
              <option>{t("settings.grading.manualReview")}</option>
              <option>{t("settings.grading.rubricBased")}</option>
            </select>
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-card-foreground">{t("settings.dualModeTitle")}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium">
                  <input type="checkbox" defaultChecked />
                  {t("settings.digital")}
                </label>
                <label className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium">
                  <input type="checkbox" defaultChecked />
                  {t("settings.physicalScan")}
                </label>
              </div>
            </div>
            <label className="block text-sm font-medium text-card-foreground">
              {t("settings.scheduledRelease")}
              <span className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <input className="w-full bg-transparent text-sm outline-none" type="datetime-local" />
              </span>
            </label>
            <button onClick={saveAssessment} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground">
              <Save className="h-4 w-4" />
              {t("settings.saveAssessment")}
            </button>
            <div className="rounded-lg border border-border bg-background p-3">
              <h3 className="font-semibold text-card-foreground">{t("savedDraft.title")}</h3>
              <div className="mt-2 space-y-2">
                {savedAssessments.map((assessment) => (
                  <p key={assessment} className="text-sm text-muted-foreground">{assessment}</p>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </AdminLayout>
  )
}
