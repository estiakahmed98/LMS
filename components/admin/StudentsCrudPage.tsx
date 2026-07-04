"use client"

import AdminLayout from "@/components/AdminLayout"
import { adminStudents, type AdminStudentStatus } from "@/lib/admin-panel-data"
import { useLocale, useTranslations } from "next-intl"
import { Bell, Download, FileDown, KeyRound, Plus, Save, Search, ShieldOff, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

type Student = (typeof adminStudents)[number]
type CourseOption = "all" | "communityParamedic" | "hrRecruitment" | "publicHealthEssentials"

const courseValueByOption: Record<CourseOption, string> = {
  all: "All",
  communityParamedic: "Community Paramedic",
  hrRecruitment: "HR & Recruitment",
  publicHealthEssentials: "Public Health Essentials",
}

const courseOptions: CourseOption[] = [
  "all",
  "communityParamedic",
  "hrRecruitment",
  "publicHealthEssentials",
]

const emptyStudent: Student = {
  id: "PSTC-NEW",
  name: "",
  email: "",
  phone: "",
  courses: ["Community Paramedic"],
  progress: 0,
  lastActive: "Just now",
  status: "Active",
  enrolledAt: "2026-07-02",
  scores: [],
  certificates: [],
}

const statuses: Array<"All" | AdminStudentStatus> = ["All", "Active", "Completed", "Suspended"]

function statusClass(status: AdminStudentStatus) {
  if (status === "Active") return "border-green-200 bg-green-50 text-green-700"
  if (status === "Completed") return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-red-200 bg-red-50 text-red-700"
}

function downloadCsv(rows: Student[], filename: string) {
  const header = ["id", "name", "email", "course", "progress", "status"]
  const body = rows.map((row) =>
    [row.id, row.name, row.email, row.courses.join(" / "), row.progress, row.status]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  )
  const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function StudentsCrudPage() {
  const t = useTranslations("adminStudentsPage")
  const tAdmin = useTranslations("admin")
  const locale = useLocale()
  const localeTag = locale === "bn" ? "bn-BD" : "en-US"
  const numberFormatter = new Intl.NumberFormat(localeTag)
  const dateFormatter = new Intl.DateTimeFormat(localeTag)
  const [students, setStudents] = useState<Student[]>(adminStudents)
  const [query, setQuery] = useState("")
  const [course, setCourse] = useState<CourseOption>("all")
  const [status, setStatus] = useState<"All" | AdminStudentStatus>("All")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState(adminStudents[0].id)
  const [draft, setDraft] = useState<Student>(adminStudents[0])
  const [notice, setNotice] = useState(t("notice.ready"))
  const [overrideScore, setOverrideScore] = useState("")
  const [overrideNote, setOverrideNote] = useState("")

  function getCourseLabel(value: string) {
    switch (value) {
      case "All":
        return t("filters.courseOptions.all")
      case "Community Paramedic":
        return t("filters.courseOptions.communityParamedic")
      case "HR & Recruitment":
        return t("filters.courseOptions.hrRecruitment")
      case "Public Health Essentials":
        return t("filters.courseOptions.publicHealthEssentials")
      default:
        return value
    }
  }

  function getStatusLabel(value: "All" | AdminStudentStatus) {
    switch (value) {
      case "All":
        return t("filters.statusOptions.all")
      case "Active":
        return t("status.active")
      case "Completed":
        return t("status.completed")
      case "Suspended":
        return t("status.suspended")
    }
  }

  function getLastActiveLabel(value: string) {
    switch (value) {
      case "Just now":
        return t("lastActive.justNow")
      case "2 hrs ago":
        return t("lastActive.hoursAgo", { count: numberFormatter.format(2) })
      case "5 hrs ago":
        return t("lastActive.hoursAgo", { count: numberFormatter.format(5) })
      case "1 day ago":
        return t("lastActive.dayAgo", { count: numberFormatter.format(1) })
      case "3 days ago":
        return t("lastActive.daysAgo", { count: numberFormatter.format(3) })
      case "14 days ago":
        return t("lastActive.daysAgo", { count: numberFormatter.format(14) })
      default:
        return value
    }
  }

  function getAssessmentLabel(value: string) {
    switch (value) {
      case "MCQ - Module 1":
        return t("assessmentLabels.mcqModule1")
      case "Written - Module 2":
        return t("assessmentLabels.writtenModule2")
      case "Practical - Module 3":
        return t("assessmentLabels.practicalModule3")
      case "MCQ - Module 4":
        return t("assessmentLabels.mcqModule4")
      case "Written - Module 1":
        return t("assessmentLabels.writtenModule1")
      case "Lab Report - Module 3":
        return t("assessmentLabels.labReportModule3")
      default:
        return value
    }
  }

  function getScoreLabel(value: string) {
    if (value === "Pending") return t("scoreLabels.pending")
    if (value === "Reviewed") return t("scoreLabels.reviewed")
    return value
  }

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const matchesQuery =
          student.name.toLowerCase().includes(query.toLowerCase()) ||
          student.id.toLowerCase().includes(query.toLowerCase()) ||
          student.email.toLowerCase().includes(query.toLowerCase())
        const selectedCourse = courseValueByOption[course]
        const matchesCourse = selectedCourse === "All" || student.courses.includes(selectedCourse)
        const matchesStatus = status === "All" || student.status === status
        return matchesQuery && matchesCourse && matchesStatus
      }),
    [course, query, status, students],
  )

  const selectedStudent = students.find((student) => student.id === selectedId) ?? students[0]

  function selectStudent(student: Student) {
    setSelectedId(student.id)
    setDraft({ ...student, courses: [...student.courses], scores: [...student.scores], certificates: [...student.certificates] })
    setNotice(t("notice.editing", { name: student.name }))
  }

  function saveStudent() {
    if (!draft.id.trim() || !draft.name.trim() || !draft.email.trim()) {
      setNotice(t("notice.requiredFields"))
      return
    }

    setStudents((current) => {
      const exists = current.some((student) => student.id === draft.id)
      const next = exists
        ? current.map((student) => (student.id === draft.id ? draft : student))
        : [{ ...draft, id: draft.id === "PSTC-NEW" ? `PSTC-${1042 + current.length}` : draft.id }, ...current]
      return next
    })
    setSelectedId(draft.id === "PSTC-NEW" ? `PSTC-${1042 + students.length}` : draft.id)
    setNotice(t("notice.saved"))
  }

  function deleteStudent(id: string) {
    setStudents((current) => current.filter((student) => student.id !== id))
    setSelectedIds((current) => current.filter((selected) => selected !== id))
    const nextStudent = students.find((student) => student.id !== id)
    if (nextStudent) selectStudent(nextStudent)
    setNotice(t("notice.deleted"))
  }

  function bulkSuspend() {
    setStudents((current) =>
      current.map((student) => (selectedIds.includes(student.id) ? { ...student, status: "Suspended" } : student)),
    )
    setNotice(
      t("notice.bulkSuspended", {
        count: numberFormatter.format(selectedIds.length),
      }),
    )
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function saveOverride() {
    if (!overrideScore.trim() || !overrideNote.trim()) {
      setNotice(t("notice.overrideRequired"))
      return
    }
    setStudents((current) =>
      current.map((student) =>
        student.id === selectedStudent.id
          ? {
              ...student,
              scores: [
                {
                  assessment: t("manualOverride.entry", {
                    date: dateFormatter.format(new Date()),
                  }),
                  score: overrideScore,
                },
                ...student.scores,
              ],
            }
          : student,
      ),
    )
    setOverrideScore("")
    setOverrideNote("")
    setNotice(t("notice.overrideSaved"))
  }

  return (
    <AdminLayout title={tAdmin("students")}>
      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_180px_160px_auto]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <select value={course} onChange={(event) => setCourse(event.target.value as CourseOption)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              {courseOptions.map((item) => (
                <option key={item} value={item}>
                  {getCourseLabel(courseValueByOption[item])}
                </option>
              ))}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value as "All" | AdminStudentStatus)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {getStatusLabel(item)}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const next = { ...emptyStudent, id: `PSTC-${1042 + students.length}`, email: "new.student@email.com" }
                setDraft(next)
                setSelectedId(next.id)
                setNotice(t("notice.newDraftReady"))
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              {t("actions.newStudent")}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                onChange={(event) => setSelectedIds(event.target.checked ? filteredStudents.map((student) => student.id) : [])}
              />
              {t("actions.selectAll")}
            </label>
            <button onClick={bulkSuspend} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
              <ShieldOff className="h-4 w-4" />
              {t("actions.bulkSuspend")}
            </button>
            <button onClick={() => downloadCsv(filteredStudents, t("csv.fileName"))} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
              <FileDown className="h-4 w-4" />
              {t("actions.exportCsv")}
            </button>
            <button
              onClick={() =>
                setNotice(
                  t("notice.notificationQueued", {
                    count: numberFormatter.format(selectedIds.length || filteredStudents.length),
                  }),
                )
              }
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Bell className="h-4 w-4" />
              {t("actions.sendNotification")}
            </button>
            <span className="ml-auto text-sm text-muted-foreground">{notice}</span>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead className="border-b border-border bg-muted/70">
                  <tr>
                    {[
                      "",
                      t("table.studentId"),
                      t("table.fullName"),
                      t("table.courses"),
                      t("table.progress"),
                      t("table.lastActive"),
                      t("table.status"),
                      t("table.actions"),
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className={selectedStudent?.id === student.id ? "bg-primary/5" : ""}>
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelected(student.id)} />
                      </td>
                      <td onClick={() => selectStudent(student)} className="cursor-pointer px-4 py-4 font-mono text-sm text-muted-foreground">
                        {student.id}
                      </td>
                      <td onClick={() => selectStudent(student)} className="cursor-pointer px-4 py-4">
                        <p className="text-sm font-semibold text-card-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </td>
                      <td className="px-4 py-4 text-sm">{student.courses.map(getCourseLabel).join(", ")}</td>
                      <td className="px-4 py-4 text-sm font-semibold">{numberFormatter.format(student.progress)}%</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{getLastActiveLabel(student.lastActive)}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(student.status)}`}>
                          {getStatusLabel(student.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => selectStudent(student)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                            {t("actions.edit")}
                          </button>
                          <button
                            onClick={() => {
                              setStudents((current) => current.map((item) => (item.id === student.id ? { ...item, status: "Suspended" } : item)))
                              setNotice(t("notice.studentSuspended", { name: student.name }))
                            }}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                          >
                            {t("actions.suspend")}
                          </button>
                          <button onClick={() => setNotice(t("notice.passwordResetSent", { email: student.email }))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                            {t("actions.resetPassword")}
                          </button>
                          <button onClick={() => deleteStudent(student.id)} className="rounded-lg border border-border p-1.5 text-destructive hover:bg-muted" aria-label={t("actions.deleteStudent", { name: student.name })}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-4 rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">{t("editor.title")}</p>
                <h2 className="text-xl font-bold text-card-foreground">{draft.name || t("editor.newStudent")}</h2>
              </div>
              <button onClick={saveStudent} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <Save className="h-4 w-4" />
                {t("editor.save")}
              </button>
            </div>

            <div className="grid gap-3">
              <input value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t("editor.fields.studentId")} />
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t("editor.fields.fullName")} />
              <input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t("editor.fields.email")} />
              <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t("editor.fields.phone")} />
              <select value={draft.courses[0]} onChange={(event) => setDraft({ ...draft, courses: [event.target.value] })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {courseOptions.filter((item) => item !== "all").map((item) => (
                  <option key={item} value={courseValueByOption[item]}>
                    {getCourseLabel(courseValueByOption[item])}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Number(event.target.value) })} type="number" min={0} max={100} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AdminStudentStatus })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  {statuses.filter((item) => item !== "All").map((item) => (
                    <option key={item} value={item}>
                      {getStatusLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-card-foreground">{t("detail.assessmentScores")}</h3>
              <div className="mt-3 divide-y divide-border">
                {(selectedStudent?.scores ?? []).map((score) => (
                  <div key={`${score.assessment}-${score.score}`} className="grid grid-cols-[1fr_70px] gap-3 py-2 text-sm">
                    <span className="text-muted-foreground">{getAssessmentLabel(score.assessment)}</span>
                    <span className="font-semibold">{getScoreLabel(score.score)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-card-foreground">{t("detail.certificates")}</h3>
              {(selectedStudent?.certificates.length ?? 0) > 0 ? (
                selectedStudent.certificates.map((certificate) => (
                  <button key={certificate} className="mt-3 flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                    <Download className="h-4 w-4 text-primary" />
                    {certificate}
                  </button>
                ))
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{t("detail.noCertificate")}</p>
              )}
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-card-foreground">{t("manualOverride.title")}</h3>
              <div className="mt-3 space-y-3">
                <input value={overrideScore} onChange={(event) => setOverrideScore(event.target.value)} placeholder={t("manualOverride.scorePlaceholder")} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <textarea value={overrideNote} onChange={(event) => setOverrideNote(event.target.value)} placeholder={t("manualOverride.notePlaceholder")} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <button onClick={saveOverride} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                  <KeyRound className="h-4 w-4" />
                  {t("manualOverride.save")}
                </button>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </AdminLayout>
  )
}
