"use client"

import AdminLayout from "@/components/AdminLayout"
import ReportsActionPage from "@/components/admin/ReportsActionPage"
import { reportRows, reportTypes } from "@/lib/admin-panel-data"
import { CalendarClock, Download, FileSpreadsheet, FileText } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const passRateChart = reportRows.map((row) => ({
  assessment: row.assessment.replace(" - ", " "),
  passRate: Number(row.passRate.replace("%", "")),
}))

export default function ReportsPage() {
  return <ReportsActionPage />

  return (
    <AdminLayout title="Reports">
      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {reportTypes.map((report, index) => (
              <button
                key={report}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  index === 2 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
                }`}
              >
                {report}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-[180px_220px_1fr]">
            <input className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" type="date" />
            <select className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>Course: All</option>
              <option>Community Paramedic</option>
              <option>Public Health Essentials</option>
            </select>
            <div className="flex flex-wrap justify-end gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                <FileText className="h-4 w-4" />
                Export PDF
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground">
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h1 className="text-xl font-bold text-card-foreground">Assessment Performance Report</h1>
              <p className="text-sm text-muted-foreground">Preview before export or schedule.</p>
            </div>
            <table className="w-full min-w-[680px]">
              <thead className="border-b border-border bg-muted/70">
                <tr>
                  {["Assessment", "Avg Score", "Pass %", "Attempts"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reportRows.map((row) => (
                  <tr key={row.assessment}>
                    <td className="px-4 py-4 text-sm font-semibold text-card-foreground">{row.assessment}</td>
                    <td className="px-4 py-4 text-sm">{row.avgScore}</td>
                    <td className="px-4 py-4 text-sm">{row.passRate}</td>
                    <td className="px-4 py-4 text-sm">{row.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-card-foreground">Scheduled Reports</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Assessment Performance Report auto-generates every Monday, 8:00 AM and emails admin@pstc.org.
            </p>
            <div className="mt-4 space-y-3">
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <option>Frequency: Weekly</option>
                <option>Frequency: Monthly</option>
              </select>
              <input className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" defaultValue="admin@pstc.org" />
              <button className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground">
                Save Schedule
              </button>
            </div>
          </aside>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Pass Rate by Assessment</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={passRateChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="assessment" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="passRate" fill="#DC2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </AdminLayout>
  )
}
