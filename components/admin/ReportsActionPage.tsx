"use client"

import AdminLayout from "@/components/AdminLayout"
import { reportRows, reportTypes } from "@/lib/admin-panel-data"
import { Download, FileSpreadsheet, FileText, Plus, Save, Trash2 } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useMemo, useState } from "react"

type ReportRow = (typeof reportRows)[number]

export default function ReportsActionPage() {
  const [activeReport, setActiveReport] = useState("Assessment Performance")
  const [rows, setRows] = useState<ReportRow[]>(reportRows)
  const [notice, setNotice] = useState("Ready")

  const chartRows = useMemo(
    () => rows.map((row) => ({ assessment: row.assessment.replace(" - ", " "), passRate: Number(row.passRate.replace("%", "")) })),
    [rows],
  )

  return (
    <AdminLayout title="Reports">
      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {reportTypes.map((report) => (
              <button key={report} onClick={() => setActiveReport(report)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${activeReport === report ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}>
                {report}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[180px_220px_1fr]">
            <input className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" type="date" />
            <select className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>Course: All</option>
              <option>Community Paramedic</option>
            </select>
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => setNotice(`${activeReport} exported as PDF.`)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"><FileText className="h-4 w-4" />PDF</button>
              <button onClick={() => setNotice(`${activeReport} exported as Excel.`)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"><FileSpreadsheet className="h-4 w-4" />Excel</button>
              <button onClick={() => setNotice(`${activeReport} exported as CSV.`)} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" />CSV</button>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{notice}</p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h1 className="text-xl font-bold text-card-foreground">{activeReport} Report</h1>
                <p className="text-sm text-muted-foreground">Editable mock preview before export.</p>
              </div>
              <button onClick={() => setRows((current) => [{ assessment: `New Assessment ${current.length + 1}`, avgScore: "80%", passRate: "88%", attempts: 100 }, ...current])} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                <Plus className="h-4 w-4" />
                Add Row
              </button>
            </div>
            <table className="w-full min-w-[680px]">
              <thead className="border-b border-border bg-muted/70">
                <tr>{["Assessment", "Avg Score", "Pass %", "Attempts", ""].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, index) => (
                  <tr key={`${row.assessment}-${index}`}>
                    <td className="px-4 py-4"><input value={row.assessment} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, assessment: event.target.value } : item))} className="w-full bg-transparent text-sm font-semibold outline-none" /></td>
                    <td className="px-4 py-4"><input value={row.avgScore} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, avgScore: event.target.value } : item))} className="w-20 bg-transparent text-sm outline-none" /></td>
                    <td className="px-4 py-4"><input value={row.passRate} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, passRate: event.target.value } : item))} className="w-20 bg-transparent text-sm outline-none" /></td>
                    <td className="px-4 py-4"><input value={row.attempts} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, attempts: Number(event.target.value) } : item))} className="w-20 bg-transparent text-sm outline-none" /></td>
                    <td className="px-4 py-4"><button onClick={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-border p-2 text-destructive hover:bg-muted"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold text-card-foreground">Scheduled Reports</h2>
            <p className="mt-2 text-sm text-muted-foreground">{activeReport} auto-generates every Monday, 8:00 AM.</p>
            <select className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>Frequency: Weekly</option>
              <option>Frequency: Monthly</option>
            </select>
            <input className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" defaultValue="admin@pstc.org" />
            <button onClick={() => setNotice("Report schedule saved.")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground">
              <Save className="h-4 w-4" />
              Save Schedule
            </button>
          </aside>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Pass Rate by Assessment</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="assessment" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
              <Bar dataKey="passRate" fill="#DC2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </AdminLayout>
  )
}
