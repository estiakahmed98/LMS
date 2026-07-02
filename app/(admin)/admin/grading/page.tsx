"use client"

import AdminLayout from "@/components/AdminLayout"
import { gradeDistribution, gradingRows } from "@/lib/admin-panel-data"
import { CheckCircle2, KeyRound, Send } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export default function GradingPage() {
  return (
    <AdminLayout title="Grading">
      <div className="space-y-6 p-6">
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-5">
          <select className="min-w-64 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option>Course: Community Paramedic</option>
            <option>HR & Recruitment</option>
            <option>Public Health Essentials</option>
          </select>
          <select className="min-w-64 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option>Assessment: MCQ - Module 4</option>
            <option>Written - Module 2</option>
            <option>Practical - Module 3</option>
          </select>
          <button className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Send className="h-4 w-4" />
            Batch Release Results
          </button>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-border bg-muted/70">
                <tr>
                  {["Student", "Score", "Grade", "Status"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gradingRows.map((row) => (
                  <tr key={row.student}>
                    <td className="px-4 py-4 text-sm font-semibold text-card-foreground">{row.student}</td>
                    <td className="px-4 py-4 text-sm">{row.score}%</td>
                    <td className="px-4 py-4">
                      <span className="rounded-lg border border-border px-2.5 py-1 text-sm font-semibold">{row.grade}</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="space-y-4 rounded-lg border border-border bg-card p-5">
            <div>
              <p className="text-sm font-semibold text-primary">Grade Override</p>
              <h2 className="text-xl font-bold text-card-foreground">Rakibul Islam</h2>
              <p className="text-sm text-muted-foreground">Original score: 54%</p>
            </div>

            <input placeholder="New score" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>Reason: Appeal Approved</option>
              <option>Reason: OMR correction</option>
              <option>Reason: Examiner review</option>
            </select>
            <textarea
              placeholder="Audit trail note (required)"
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground">
              <KeyRound className="h-4 w-4" />
              Save Override - Logged
            </button>

            <div className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
              <CheckCircle2 className="mb-2 h-5 w-5 text-green-600" />
              Overrides require reason selection and are written to the audit trail.
            </div>
          </aside>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Grade Distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={gradeDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="grade" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="#DC2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </AdminLayout>
  )
}
