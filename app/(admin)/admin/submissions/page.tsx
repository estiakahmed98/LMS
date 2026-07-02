"use client"

import AdminLayout from "@/components/AdminLayout"
import SubmissionsActionPage from "@/components/admin/SubmissionsActionPage"
import { scanReviewRows, submissionRows, type SubmissionStatus } from "@/lib/admin-panel-data"
import { Check, Flag, FlaskConical, Maximize2, MessageSquareWarning, PenLine, Search } from "lucide-react"
import { useMemo, useState } from "react"

function submissionStatusClass(status: SubmissionStatus) {
  if (status === "Pending") return "border-yellow-200 bg-yellow-50 text-yellow-800"
  if (status === "Reviewed") return "border-green-200 bg-green-50 text-green-700"
  return "border-red-200 bg-red-50 text-red-700"
}

function typeIcon(type: string) {
  if (type === "Lab") return <FlaskConical className="h-4 w-4" />
  return <PenLine className="h-4 w-4" />
}

export default function SubmissionsPage() {
  return <SubmissionsActionPage />

  const [status, setStatus] = useState<"All" | SubmissionStatus>("Pending")
  const [selectedId, setSelectedId] = useState("SUB-2292")

  const visibleRows = useMemo(
    () => submissionRows.filter((row) => status === "All" || row.status === status),
    [status],
  )
  const selected = submissionRows.find((row) => row.id === selectedId) ?? submissionRows[1]

  return (
    <AdminLayout title="Submissions">
      <div className="space-y-6 p-6">
        <section className="grid gap-3 rounded-lg border border-border bg-card p-5 md:grid-cols-5">
          <select className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option>Type: All</option>
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
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "All" | SubmissionStatus)}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option>All</option>
            <option>Pending</option>
            <option>Reviewed</option>
            <option>Disputed</option>
          </select>
          <button className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
            <Search className="h-4 w-4" />
            Filter
          </button>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-border bg-muted/70">
                <tr>
                  {["ID", "Student", "Assessment", "Type", "Status"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`cursor-pointer hover:bg-muted/40 ${selected.id === row.id ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-4 py-4 font-mono text-sm text-muted-foreground">{row.id}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-card-foreground">{row.student}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{row.assessment}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1 text-sm">
                        {typeIcon(row.type)}
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${submissionStatusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5">
              <p className="text-sm font-semibold text-primary">Review Panel</p>
              <h2 className="text-xl font-bold text-card-foreground">
                {selected.type} / {selected.assessment} - {selected.id}
              </h2>
              <p className="text-sm text-muted-foreground">{selected.student}</p>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-card-foreground">Scanned Answer Sheet</h3>
                <button className="rounded-lg border border-border p-2 hover:bg-muted" aria-label="Zoom scan">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid h-48 place-items-center rounded-lg border border-dashed border-border bg-card">
                <div className="text-center">
                  <p className="font-mono text-sm font-semibold text-card-foreground">OMR-S-2292</p>
                  <p className="text-sm text-muted-foreground">zoomable thumbnail</p>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-border">
              <table className="w-full">
                <thead className="bg-muted/70">
                  <tr>
                    {["Q", "Student", "Correct", ""].map((heading) => (
                      <th key={heading} className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scanReviewRows.map((row) => (
                    <tr key={row.q}>
                      <td className="px-3 py-2 text-sm font-semibold">{row.q}</td>
                      <td className="px-3 py-2 text-sm">{row.student}</td>
                      <td className="px-3 py-2 text-sm">{row.correct}</td>
                      <td className="px-3 py-2">
                        <span className={row.matched ? "text-green-600" : "text-red-600"}>
                          {row.matched ? "OK" : "Fix"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="mt-4 flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
              Manual correction toggle available per row
              <input type="checkbox" defaultChecked />
            </label>

            <div className="mt-4 grid gap-3">
              <input placeholder="Override total score" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <textarea placeholder="Feedback / notes" rows={3} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <Check className="h-4 w-4" />
                Approve
              </button>
              <button className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                <MessageSquareWarning className="h-4 w-4" />
                Clarify
              </button>
              <button className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                <Flag className="h-4 w-4" />
                Flag
              </button>
            </div>
          </aside>
        </section>
      </div>
    </AdminLayout>
  )
}
