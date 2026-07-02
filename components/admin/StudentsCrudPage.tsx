"use client"

import AdminLayout from "@/components/AdminLayout"
import { adminStudents, type AdminStudentStatus } from "@/lib/admin-panel-data"
import { Bell, Download, FileDown, KeyRound, Plus, Save, Search, ShieldOff, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

type Student = (typeof adminStudents)[number]

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

const courses = ["All", "Community Paramedic", "HR & Recruitment", "Public Health Essentials"]
const statuses: Array<"All" | AdminStudentStatus> = ["All", "Active", "Completed", "Suspended"]

function statusClass(status: AdminStudentStatus) {
  if (status === "Active") return "border-green-200 bg-green-50 text-green-700"
  if (status === "Completed") return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-red-200 bg-red-50 text-red-700"
}

function downloadCsv(rows: Student[]) {
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
  link.download = "pstc-students.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export default function StudentsCrudPage() {
  const [students, setStudents] = useState<Student[]>(adminStudents)
  const [query, setQuery] = useState("")
  const [course, setCourse] = useState("All")
  const [status, setStatus] = useState<"All" | AdminStudentStatus>("All")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState(adminStudents[0].id)
  const [draft, setDraft] = useState<Student>(adminStudents[0])
  const [notice, setNotice] = useState("Ready")
  const [overrideScore, setOverrideScore] = useState("")
  const [overrideNote, setOverrideNote] = useState("")

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const matchesQuery =
          student.name.toLowerCase().includes(query.toLowerCase()) ||
          student.id.toLowerCase().includes(query.toLowerCase()) ||
          student.email.toLowerCase().includes(query.toLowerCase())
        const matchesCourse = course === "All" || student.courses.includes(course)
        const matchesStatus = status === "All" || student.status === status
        return matchesQuery && matchesCourse && matchesStatus
      }),
    [course, query, status, students],
  )

  const selectedStudent = students.find((student) => student.id === selectedId) ?? students[0]

  function selectStudent(student: Student) {
    setSelectedId(student.id)
    setDraft({ ...student, courses: [...student.courses], scores: [...student.scores], certificates: [...student.certificates] })
    setNotice(`Editing ${student.name}`)
  }

  function saveStudent() {
    if (!draft.id.trim() || !draft.name.trim() || !draft.email.trim()) {
      setNotice("Student ID, name, and email are required.")
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
    setNotice("Student saved in mock state.")
  }

  function deleteStudent(id: string) {
    setStudents((current) => current.filter((student) => student.id !== id))
    setSelectedIds((current) => current.filter((selected) => selected !== id))
    const nextStudent = students.find((student) => student.id !== id)
    if (nextStudent) selectStudent(nextStudent)
    setNotice("Student deleted from mock state.")
  }

  function bulkSuspend() {
    setStudents((current) =>
      current.map((student) => (selectedIds.includes(student.id) ? { ...student, status: "Suspended" } : student)),
    )
    setNotice(`${selectedIds.length} selected student(s) suspended.`)
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function saveOverride() {
    if (!overrideScore.trim() || !overrideNote.trim()) {
      setNotice("Override score and audit note are required.")
      return
    }
    setStudents((current) =>
      current.map((student) =>
        student.id === selectedStudent.id
          ? {
              ...student,
              scores: [{ assessment: `Manual Override - ${new Date().toLocaleDateString()}`, score: overrideScore }, ...student.scores],
            }
          : student,
      ),
    )
    setOverrideScore("")
    setOverrideNote("")
    setNotice("Manual override saved with audit note.")
  }

  return (
    <AdminLayout title="Students">
      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_180px_160px_auto]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, ID, or email..."
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <select value={course} onChange={(event) => setCourse(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              {courses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value as "All" | AdminStudentStatus)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const next = { ...emptyStudent, id: `PSTC-${1042 + students.length}`, email: "new.student@email.com" }
                setDraft(next)
                setSelectedId(next.id)
                setNotice("New student draft ready.")
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              New Student
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                onChange={(event) => setSelectedIds(event.target.checked ? filteredStudents.map((student) => student.id) : [])}
              />
              Select All
            </label>
            <button onClick={bulkSuspend} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
              <ShieldOff className="h-4 w-4" />
              Bulk Suspend
            </button>
            <button onClick={() => downloadCsv(filteredStudents)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
              <FileDown className="h-4 w-4" />
              Export CSV
            </button>
            <button onClick={() => setNotice(`Notification queued for ${selectedIds.length || filteredStudents.length} student(s).`)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
              <Bell className="h-4 w-4" />
              Send Notification
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
                    {["", "Student ID", "Full Name", "Course(s)", "Progress", "Last Active", "Status", "Actions"].map((heading) => (
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
                      <td className="px-4 py-4 text-sm">{student.courses.join(", ")}</td>
                      <td className="px-4 py-4 text-sm font-semibold">{student.progress}%</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{student.lastActive}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => selectStudent(student)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setStudents((current) => current.map((item) => (item.id === student.id ? { ...item, status: "Suspended" } : item)))
                              setNotice(`${student.name} suspended.`)
                            }}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                          >
                            Suspend
                          </button>
                          <button onClick={() => setNotice(`Password reset link sent to ${student.email}.`)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                            Reset Password
                          </button>
                          <button onClick={() => deleteStudent(student.id)} className="rounded-lg border border-border p-1.5 text-destructive hover:bg-muted" aria-label={`Delete ${student.name}`}>
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
                <p className="text-sm font-semibold text-primary">Student CRUD</p>
                <h2 className="text-xl font-bold text-card-foreground">{draft.name || "New Student"}</h2>
              </div>
              <button onClick={saveStudent} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>

            <div className="grid gap-3">
              <input value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Student ID" />
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Full name" />
              <input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Email" />
              <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Phone" />
              <select value={draft.courses[0]} onChange={(event) => setDraft({ ...draft, courses: [event.target.value] })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {courses.filter((item) => item !== "All").map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Number(event.target.value) })} type="number" min={0} max={100} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AdminStudentStatus })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  {statuses.filter((item) => item !== "All").map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-card-foreground">Assessment Scores</h3>
              <div className="mt-3 divide-y divide-border">
                {(selectedStudent?.scores ?? []).map((score) => (
                  <div key={`${score.assessment}-${score.score}`} className="grid grid-cols-[1fr_70px] gap-3 py-2 text-sm">
                    <span className="text-muted-foreground">{score.assessment}</span>
                    <span className="font-semibold">{score.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-card-foreground">Certificates</h3>
              {(selectedStudent?.certificates.length ?? 0) > 0 ? (
                selectedStudent.certificates.map((certificate) => (
                  <button key={certificate} className="mt-3 flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                    <Download className="h-4 w-4 text-primary" />
                    {certificate}
                  </button>
                ))
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No certificate issued yet.</p>
              )}
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-card-foreground">Manual Override</h3>
              <div className="mt-3 space-y-3">
                <input value={overrideScore} onChange={(event) => setOverrideScore(event.target.value)} placeholder="New grade / score" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <textarea value={overrideNote} onChange={(event) => setOverrideNote(event.target.value)} placeholder="Audit note (required)" rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <button onClick={saveOverride} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                  <KeyRound className="h-4 w-4" />
                  Save Override
                </button>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </AdminLayout>
  )
}
