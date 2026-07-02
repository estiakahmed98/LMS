"use client"

import AdminLayout from "@/components/AdminLayout"
import { gradingRows } from "@/lib/admin-panel-data"
import { KeyRound, Send } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useMemo, useState } from "react"

type GradeRow = (typeof gradingRows)[number]

function gradeFor(score: number) {
  if (score >= 85) return "A"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  return "Fail"
}

export default function GradingActionPage() {
  const [rows, setRows] = useState<GradeRow[]>(gradingRows)
  const [selectedStudent, setSelectedStudent] = useState("Rakibul Islam")
  const [newScore, setNewScore] = useState("60")
  const [reason, setReason] = useState("Appeal Approved")
  const [note, setNote] = useState("")
  const [notice, setNotice] = useState("Ready")

  const selected = rows.find((row) => row.student === selectedStudent) ?? rows[0]
  const distribution = useMemo(() => {
    const base = ["A", "B", "C", "Fail"].map((grade) => ({ grade, count: 0 }))
    rows.forEach((row) => {
      const bucket = base.find((item) => item.grade === row.grade)
      if (bucket) bucket.count += 1
    })
    return base
  }, [rows])

  function saveOverride() {
    const score = Number(newScore)
    if (Number.isNaN(score) || !note.trim()) {
      setNotice("Valid score and audit note are required.")
      return
    }
    setRows((current) =>
      current.map((row) =>
        row.student === selected.student
          ? { ...row, score, grade: gradeFor(score), status: `Override - ${reason}` }
          : row,
      ),
    )
    setNotice(`Override saved for ${selected.student}.`)
  }

  return (
    <AdminLayout title="Grading">
      <div className="space-y-6 p-6">
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-5">
          <select className="min-w-64 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option>Course: Community Paramedic</option>
            <option>HR & Recruitment</option>
          </select>
          <select className="min-w-64 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option>Assessment: MCQ - Module 4</option>
            <option>Written - Module 2</option>
          </select>
          <button
            onClick={() => {
              setRows((current) => current.map((row) => ({ ...row, status: "Released" })))
              setNotice("All results released in mock state.")
            }}
            className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Send className="h-4 w-4" />
            Batch Release Results
          </button>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-border bg-muted/70">
                <tr>{["Student", "Score", "Grade", "Status"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.student} onClick={() => setSelectedStudent(row.student)} className={`cursor-pointer hover:bg-muted/40 ${selected.student === row.student ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-4 text-sm font-semibold">{row.student}</td>
                    <td className="px-4 py-4 text-sm">{row.score}%</td>
                    <td className="px-4 py-4"><span className="rounded-lg border border-border px-2.5 py-1 text-sm font-semibold">{row.grade}</span></td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="space-y-4 rounded-lg border border-border bg-card p-5">
            <div>
              <p className="text-sm font-semibold text-primary">Grade Override</p>
              <h2 className="text-xl font-bold text-card-foreground">{selected.student}</h2>
              <p className="text-sm text-muted-foreground">Original score: {selected.score}%</p>
            </div>
            <input value={newScore} onChange={(event) => setNewScore(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            <select value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>Appeal Approved</option>
              <option>OMR correction</option>
              <option>Examiner review</option>
            </select>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Audit trail note (required)" rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            <button onClick={saveOverride} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground">
              <KeyRound className="h-4 w-4" />
              Save Override - Logged
            </button>
            <p className="text-sm text-muted-foreground">{notice}</p>
          </aside>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Grade Distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="grade" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
              <Bar dataKey="count" fill="#DC2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </AdminLayout>
  )
}
