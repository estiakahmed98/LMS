"use client"

import AdminLayout from "@/components/AdminLayout"
import { assessmentQuestionSet } from "@/lib/admin-panel-data"
import { CalendarClock, ClipboardList, FilePenLine, FlaskConical, Plus, Shuffle } from "lucide-react"
import { useState } from "react"

const assessmentModes = [
  { label: "MCQ", icon: ClipboardList },
  { label: "Written Exam", icon: FilePenLine },
  { label: "Practice Quiz", icon: Shuffle },
  { label: "Practical / Lab", icon: FlaskConical },
]

export default function AssessmentBuilderPage() {
  const [mode, setMode] = useState("MCQ")

  return (
    <AdminLayout title="Build Assessment">
      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {assessmentModes.map((item) => {
              const Icon = item.icon
              const active = mode === item.label
              return (
                <button
                  key={item.label}
                  onClick={() => setMode(item.label)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_220px_120px_120px]">
            <label className="block text-sm font-medium text-card-foreground">
              Assessment Title
              <input
                defaultValue={`${mode} - Module 4`}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="block text-sm font-medium text-card-foreground">
              Module
              <select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <option>Community Paramedic</option>
                <option>HR & Recruitment</option>
                <option>Public Health Essentials</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-card-foreground">
              Pass
              <input defaultValue="70%" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-sm font-medium text-card-foreground">
              Time
              <input defaultValue="30m" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </label>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">Question Builder</h2>
                <p className="text-sm text-muted-foreground">
                  Unified editor for {mode.toLowerCase()} assessment delivery.
                </p>
              </div>
              <button className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Add Question
              </button>
            </div>

            <div className="divide-y divide-border">
              {assessmentQuestionSet.map((question) => (
                <article key={question.number} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">
                      Q{question.number}
                    </span>
                    <span className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold">
                      {question.difficulty}
                    </span>
                  </div>
                  <textarea
                    defaultValue={
                      mode === "Practical / Lab"
                        ? "Describe the lab skill, required evidence, and examiner rubric."
                        : mode === "Written Exam"
                          ? "Write a scenario-based written prompt and expected marking rubric."
                          : question.prompt
                    }
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
                  />

                  {mode === "MCQ" || mode === "Practice Quiz" ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {question.options.map((option, index) => (
                        <label key={option} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                          <input name={`q-${question.number}`} type="radio" defaultChecked={index === 1} />
                          {option}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <textarea
                        placeholder="Rubric / model answer"
                        rows={3}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                      />
                      <input
                        placeholder={mode === "Practical / Lab" ? "Evidence required: lab report, photo, examiner mark" : "Marks: 25"}
                        className="h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-4 rounded-lg border border-border bg-card p-5">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">Settings</h2>
              <p className="text-sm text-muted-foreground">Delivery, grading, and release controls.</p>
            </div>

            <div className="space-y-3">
              {[
                "Randomize Questions",
                "Show Answers After Submission",
                "Require audit note for manual override",
              ].map((label, index) => (
                <label key={label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                  {label}
                  <input type="checkbox" defaultChecked={index !== 1} />
                </label>
              ))}
            </div>

            <label className="block text-sm font-medium text-card-foreground">
              Max Attempts
              <input defaultValue="2" type="number" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </label>

            <label className="block text-sm font-medium text-card-foreground">
              Grading
              <select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <option>Auto-graded</option>
                <option>Manual review</option>
                <option>Rubric-based</option>
              </select>
            </label>

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

            <button className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Save Assessment
            </button>
          </aside>
        </section>
      </div>
    </AdminLayout>
  )
}
