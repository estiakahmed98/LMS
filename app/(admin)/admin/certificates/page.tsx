"use client"

import AdminLayout from "@/components/AdminLayout"
import CertificatesActionPage from "@/components/admin/CertificatesActionPage"
import { certificateRows } from "@/lib/admin-panel-data"
import { Award, Download, RotateCcw, Upload, XCircle } from "lucide-react"

function certificateStatusClass(status: string) {
  if (status === "Valid") return "border-green-200 bg-green-50 text-green-700"
  return "border-red-200 bg-red-50 text-red-700"
}

export default function CertificatesPage() {
  return <CertificatesActionPage />

  return (
    <AdminLayout title="Certificates">
      <div className="space-y-6 p-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h1 className="text-xl font-bold text-card-foreground">Certificate Management</h1>
                <p className="text-sm text-muted-foreground">Issue, revoke, and re-issue certificates.</p>
              </div>
              <Award className="h-6 w-6 text-primary" />
            </div>
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-border bg-muted/70">
                <tr>
                  {["Cert ID", "Student", "Course", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {certificateRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-4 font-mono text-sm text-muted-foreground">{row.id}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-card-foreground">{row.student}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{row.course}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${certificateStatusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-lg border border-border p-2 hover:bg-muted" aria-label="Download certificate">
                          <Download className="h-4 w-4" />
                        </button>
                        <button className="rounded-lg border border-border p-2 hover:bg-muted" aria-label="Revoke certificate">
                          <XCircle className="h-4 w-4" />
                        </button>
                        <button className="rounded-lg border border-border p-2 hover:bg-muted" aria-label="Re-issue certificate">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-card-foreground">Bulk Issue Certificates</h2>
              <div className="mt-4 space-y-3">
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                  <option>Course: Community Paramedic</option>
                  <option>Public Health Essentials</option>
                  <option>HR & Recruitment</option>
                </select>
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                  <option>Status: Pass</option>
                  <option>Status: Completed</option>
                </select>
                <button className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground">
                  Preview List - Issue All (14)
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-card-foreground">Revoke Certificate</h2>
              <textarea
                placeholder="Reason for revocation"
                rows={3}
                className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" />
                Confirm revocation
              </label>
              <button className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
                Revoke Certificate
              </button>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-semibold text-card-foreground">Template Designer</h2>
            <div className="mt-4 space-y-3">
              <input defaultValue="PSTC" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                <Upload className="h-4 w-4" />
                Director Signature Upload
              </button>
              <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                <Upload className="h-4 w-4" />
                Official Seal Upload
              </button>
              <label className="block text-sm font-medium text-card-foreground">
                Border Color
                <input defaultValue="#DC2626" type="color" className="mt-2 h-10 w-full rounded-lg border border-border bg-background" />
              </label>
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <option>Font: Serif Formal</option>
                <option>Font: Sans Modern</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border-4 border-primary bg-card p-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Certificate of Completion</p>
            <p className="mt-8 text-muted-foreground">This certifies that</p>
            <h3 className="mt-3 text-4xl font-bold text-card-foreground">Fahim Ahmed</h3>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              has successfully completed Community Paramedic Training
            </p>
            <div className="mt-10 flex items-end justify-between text-sm text-muted-foreground">
              <span>Director Signature</span>
              <span className="text-2xl font-bold text-primary">PSTC</span>
              <span>Official Seal</span>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
