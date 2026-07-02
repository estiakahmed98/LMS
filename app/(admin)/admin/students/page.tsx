"use client"

import AdminLayout from "@/components/AdminLayout"
import { adminStudents, type AdminStudentStatus } from "@/lib/admin-panel-data"
import {
  Bell,
  CalendarDays,
  Download,
  FileDown,
  KeyRound,
  Search,
  ShieldOff,
  UserRoundCheck,
} from "lucide-react"
import { useMemo, useState } from "react"

const courses = ["All", "Community Paramedic", "HR & Recruitment", "Public Health Essentials"]
const statuses: Array<"All" | AdminStudentStatus> = ["All", "Active", "Completed", "Suspended"]

function statusClass(status: AdminStudentStatus) {
  if (status === "Active") return "border-green-200 bg-green-50 text-green-700"
  if (status === "Completed") return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-red-200 bg-red-50 text-red-700"
}

export default function AdminStudentsPage() {
  const [query, setQuery] = useState("")
  const [course, setCourse] = useState("All")
  const [status, setStatus] = useState<"All" | AdminStudentStatus>("All")
  const [selectedId, setSelectedId] = useState(adminStudents[0].id)

  const filteredStudents = useMemo(
    () =>
      adminStudents.filter((student) => {
        const matchesQuery =
          student.name.toLowerCase().includes(query.toLowerCase()) ||
          student.id.toLowerCase().includes(query.toLowerCase()) ||
          student.email.toLowerCase().includes(query.toLowerCase())
        const matchesCourse = course === "All" || student.courses.includes(course)
        const matchesStatus = status === "All" || student.status === status
        return matchesQuery && matchesCourse && matchesStatus
      }),
    [course, query, status],
  )

  const selectedStudent =
    adminStudents.find((student) => student.id === selectedId) ?? adminStudents[0]

  return (
    <AdminLayout title="Students">
      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_180px_160px_220px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or ID..."
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <select
              value={course}
              onChange={(event) => setCourse(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            >
              {courses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "All" | AdminStudentStatus)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            >
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <button className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium hover:bg-muted">
              <CalendarDays className="h-4 w-4" />
              Enrollment Date Range
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4" />
              Select All
            </label>
            <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
              <ShieldOff className="h-4 w-4" />
              Bulk Suspend
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
              <FileDown className="h-4 w-4" />
              Export CSV
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Bell className="h-4 w-4" />
              Send Notification
            </button>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="border-b border-border bg-muted/70">
                  <tr>
                    {["Student ID", "Full Name", "Course(s)", "Progress", "Last Active", "Status", "Actions"].map(
                      (heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/40 ${
                        selectedStudent.id === student.id ? "bg-primary/5" : ""
                      }`}
                      onClick={() => setSelectedId(student.id)}
                    >
                      <td className="px-4 py-4 font-mono text-sm text-muted-foreground">{student.id}</td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-card-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-card-foreground">{student.courses.join(", ")}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${student.progress}%` }} />
                          </div>
                          <span className="text-sm font-semibold">{student.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{student.lastActive}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                            View Profile
                          </button>
                          <button className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                            Suspend
                          </button>
                          <button className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                            Reset Password
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
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">Student Detail</p>
                <h2 className="text-xl font-bold text-card-foreground">{selectedStudent.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedStudent.id} - {selectedStudent.email} - {selectedStudent.phone}
                </p>
              </div>
              <UserRoundCheck className="h-6 w-6 text-primary" />
            </div>

            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-4 py-3">
                <h3 className="font-semibold text-card-foreground">Assessment Scores</h3>
              </div>
              <div className="divide-y divide-border">
                {selectedStudent.scores.map((score) => (
                  <div key={score.assessment} className="grid grid-cols-[1fr_70px] gap-3 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">{score.assessment}</span>
                    <span className="font-semibold text-card-foreground">{score.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-card-foreground">Certificates</h3>
              {selectedStudent.certificates.length ? (
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
                <input
                  placeholder="New grade / score"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <textarea
                  placeholder="Audit note (required)"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
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
