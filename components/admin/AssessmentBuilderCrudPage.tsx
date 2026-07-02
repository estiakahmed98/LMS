"use client"

import AdminLayout from "@/components/AdminLayout"
import { assessmentQuestionSet } from "@/lib/admin-panel-data"
import { CalendarClock, ClipboardList, FilePenLine, FlaskConical, Plus, Save, Shuffle, Trash2 } from "lucide-react"
import { useState } from "react"

type Question = {
  id: string
  difficulty: string
  prompt: string
  options: string[]
  rubric: string
}

const modes = [
  { label: "MCQ", icon: ClipboardList },
  { label: "Written Exam", icon: FilePenLine },
  { label: "Practice Quiz", icon: Shuffle },
  { label: "Practical / Lab", icon: FlaskConical },
]

const initialQuestions: Question[] = assessmentQuestionSet.map((question) => ({
  id: `q-${question.number}`,
  difficulty: question.difficulty,
  prompt: question.prompt,
  options: [...question.options],
  rubric: "Rubric / model answer",
}))

export default function AssessmentBuilderCrudPage() {
  const [mode, setMode] = useState("MCQ")
  const [title, setTitle] = useState("MCQ - Module 4")
  const [moduleName, setModuleName] = useState("Community Paramedic")
  const [passMark, setPassMark] = useState("70%")
  const [timeLimit, setTimeLimit] = useState("30m")
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [savedAssessments, setSavedAssessments] = useState<string[]>([])
  const [notice, setNotice] = useState("Ready")

  function addQuestion() {
    setQuestions((current) => [
      ...current,
      {
        id: `q-${Date.now()}`,
        difficulty: "Medium",
        prompt: mode === "MCQ" || mode === "Practice Quiz" ? "New question prompt" : "New rubric-based prompt",
        options: ["Option A", "Option B", "Option C", "Option D"],
        rubric: "Add marking rubric",
      },
    ])
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((current) => current.map((question) => (question.id === id ? { ...question, ...patch } : question)))
  }

  function saveAssessment() {
    const label = `${title} (${mode}) - ${questions.length} question(s)`
    setSavedAssessments((current) => [label, ...current])
    setNotice("Assessment saved in mock state.")
  }

  return (
    <AdminLayout title="Build Assessment">
      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {modes.map((item) => {
              const Icon = item.icon
              const active = mode === item.label
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setMode(item.label)
                    setTitle(`${item.label} - Module 4`)
                    setNotice(`${item.label} tab active.`)
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
            <span className="ml-auto text-sm text-muted-foreground">{notice}</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_220px_120px_120px]">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            <select value={moduleName} onChange={(event) => setModuleName(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>Community Paramedic</option>
              <option>HR & Recruitment</option>
              <option>Public Health Essentials</option>
            </select>
            <input value={passMark} onChange={(event) => setPassMark(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            <input value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">Question Builder</h2>
                <p className="text-sm text-muted-foreground">{moduleName} - {passMark} pass - {timeLimit}</p>
              </div>
              <button onClick={addQuestion} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" />
                Add Question
              </button>
            </div>

            <div className="divide-y divide-border">
              {questions.map((question, questionIndex) => (
                <article key={question.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">Q{questionIndex + 1}</span>
                    <select value={question.difficulty} onChange={(event) => updateQuestion(question.id, { difficulty: event.target.value })} className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold">
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                    <button
                      onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}
                      className="ml-auto rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                      aria-label="Delete question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <textarea value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium" />

                  {mode === "MCQ" || mode === "Practice Quiz" ? (
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
            <h2 className="text-lg font-semibold text-card-foreground">Settings</h2>
            {["Randomize Questions", "Show Answers After Submission", "Require audit note for manual override"].map((label, index) => (
              <label key={label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                {label}
                <input type="checkbox" defaultChecked={index !== 1} />
              </label>
            ))}
            <input defaultValue="2" type="number" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>Auto-graded</option>
              <option>Manual review</option>
              <option>Rubric-based</option>
            </select>
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-card-foreground">Dual-Mode Delivery</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium">
                  <input type="checkbox" defaultChecked />
                  Digital
                </label>
                <label className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium">
                  <input type="checkbox" defaultChecked />
                  Physical Scan
                </label>
              </div>
            </div>
            <label className="block text-sm font-medium text-card-foreground">
              Scheduled Release
              <span className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <input className="w-full bg-transparent text-sm outline-none" type="datetime-local" />
              </span>
            </label>
            <button onClick={saveAssessment} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground">
              <Save className="h-4 w-4" />
              Save Assessment
            </button>
            <div className="rounded-lg border border-border bg-background p-3">
              <h3 className="font-semibold text-card-foreground">Saved Drafts</h3>
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
