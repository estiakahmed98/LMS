"use client"

import AdminLayout from "@/components/AdminLayout"
import { permissionModules, roleActivityLog } from "@/lib/admin-panel-data"
import { Check, Plus, ShieldCheck, X } from "lucide-react"

const roles = ["Super Admin", "Course Manager", "Examiner", "Report Viewer"]
const permissionColumns = ["View", "Create", "Edit", "Delete", "Export"]

export default function RolesPage() {
  return (
    <AdminLayout title="Roles & Permissions">
      <div className="grid gap-6 p-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-card-foreground">Roles</h1>
            <button className="rounded-lg bg-primary p-2 text-primary-foreground" aria-label="Add new role">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {roles.map((role, index) => (
              <button
                key={role}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm font-semibold ${
                  index === 1 ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                {role}
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-primary">Permissions Matrix</p>
              <h2 className="text-xl font-bold text-card-foreground">Course Manager</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-border bg-muted/70">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Module</th>
                    {permissionColumns.map((column) => (
                      <th key={column} className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {permissionModules.map((row) => (
                    <tr key={row.module}>
                      <td className="px-4 py-4 text-sm font-semibold text-card-foreground">{row.module}</td>
                      {row.values.map((value, index) => (
                        <td key={`${row.module}-${permissionColumns[index]}`} className="px-4 py-4 text-center">
                          <button
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                              value === "yes"
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-border bg-background text-muted-foreground"
                            }`}
                            aria-label={`${row.module} ${permissionColumns[index]}`}
                          >
                            {value === "yes" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-card-foreground">Assigned Users</h2>
              <p className="mt-2 text-sm text-muted-foreground">A. Karim, S. Rahman, T. Chowdhury</p>
              <button className="mt-4 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                Manage Users
              </button>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-card-foreground">Activity Log</h2>
              <div className="mt-3 space-y-3">
                {roleActivityLog.map((item) => (
                  <p key={item} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
