"use client"

import AdminLayout from "@/components/AdminLayout"
import { scanReviewRows, submissionRows, type SubmissionStatus } from "@/lib/admin-panel-data"
import { Check, Flag, FlaskConical, Maximize2, MessageSquareWarning, PenLine, Search } from "lucide-react"
import { useMemo, useState } from "react"

type Submission = (typeof submissionRows)[number] & { score?: string; note?: string }

function statusClass(status: SubmissionStatus) {
  if (status === "Pending") return "border-yellow-200 bg-yellow-50 text-yellow-800"
  if (status === "Reviewed") return "border-green-200 bg-green-50 text-green-700"
  return "border-red-200 bg-red-50 text-red-700"
}

export default function SubmissionsActionPage() {
  const [rows, setRows] = useState<Submission[]>(submissionRows)
  const [type, setType] = useState("All")
  const [status, setStatus] = useState<"All" | SubmissionStatus>("Pending")
  const [selectedId, setSelectedId] = useState("SUB-2292")
  const [score, setScore] = useState("")
  const [note, setNote] = useState("")
  const [notice, setNotice] = useState("Ready")

  const visibleRows = useMemo(
    () => rows.filter((row) => (status === "All" || row.status === status) && (type === "All" || row.type === type)),
    [rows, status, type],
  )
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0]

  function updateSelected(patch: Partial<Submission>, message: string) {
    setRows((current) => current.map((row) => (row.id === selected.id ? { ...row, ...patch } : row)))
    setNotice(message)
  }

  return (
    <AdminLayout title="Submissions">
      <div className="space-y-6 p-6">
        <section className="grid gap-3 rounded-lg border border-border bg-card p-5 md:grid-cols-5">
          <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option>All</option>
            <option>Written</option>
            <option>OMR</option>
            <option>Lab</option>
            <option>Scan</option>
          </select>
          <select className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option>Course: All</option>
            <option>Community Paramedic</option>
            <option>HR & Recruitment</option>
          </select>
          <input className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" type="date" />
          <select value={status} onChange={(event) => setStatus(event.target.value as "All" | SubmissionStatus)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option>All</option>
            <option>Pending</option>
            <option>Reviewed</option>
            <option>Disputed</option>
          </select>
          <button onClick={() => setNotice(`${visibleRows.length} submission(s) visible.`)} className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
            <Search className="h-4 w-4" />
            Filter
          </button>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-border bg-muted/70">
                <tr>
                  {["ID", "Student", "Assessment", "Type", "Status", "Score"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleRows.map((row) => (
                  <tr key={row.id} onClick={() => setSelectedId(row.id)} className={`cursor-pointer hover:bg-muted/40 ${selected.id === row.id ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-4 font-mono text-sm text-muted-foreground">{row.id}</td>
                    <td className="px-4 py-4 text-sm font-semibold">{row.student}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{row.assessment}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1">
                        {row.type === "Lab" ? <FlaskConical className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>{row.status}</span></td>
                    <td className="px-4 py-4 text-sm">{row.score ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm font-semibold text-primary">Review Panel</p>
            <h2 className="text-xl font-bold text-card-foreground">{selected.type} / {selected.assessment}</h2>
            <p className="text-sm text-muted-foreground">{selected.student} - {selected.id}</p>

            <div className="mt-5 rounded-lg border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-card-foreground">Scanned Answer Sheet</h3>
                <button onClick={() => setNotice("Zoom preview opened in mock mode.")} className="rounded-lg border border-border p-2 hover:bg-muted" aria-label="Zoom scan">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid h-44 place-items-center rounded-lg border border-dashed border-border bg-card">
                <div className="text-center">
                  <p className="font-mono text-sm font-semibold">OMR-S-{selected.id.replace("SUB-", "")}</p>
                  <p className="text-sm text-muted-foreground">zoomable thumbnail</p>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-border">
              <table className="w-full">
                <tbody className="divide-y divide-border">
                  {scanReviewRows.map((row) => (
                    <tr key={row.q}>
                      <td className="px-3 py-2 text-sm font-semibold">Q{row.q}</td>
                      <td className="px-3 py-2 text-sm">{row.student}</td>
                      <td className="px-3 py-2 text-sm">{row.correct}</td>
                      <td className={row.matched ? "px-3 py-2 text-green-600" : "px-3 py-2 text-red-600"}>{row.matched ? "OK" : "Fix"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3">
              <input value={score} onChange={(event) => setScore(event.target.value)} placeholder="Override total score" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Feedback / notes" rows={3} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={() => updateSelected({ status: "Reviewed", score, note }, "Submission approved.")} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <Check className="h-4 w-4" />
                Approve
              </button>
              <button onClick={() => updateSelected({ status: "Disputed", note }, "Clarification requested.")} className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                <MessageSquareWarning className="h-4 w-4" />
                Clarify
              </button>
              <button onClick={() => updateSelected({ status: "Disputed", note: note || "Flagged for examiner." }, "Submission flagged.")} className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                <Flag className="h-4 w-4" />
                Flag
              </button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{notice}</p>
          </aside>
        </section>
      </div>
    </AdminLayout>
  )
}
