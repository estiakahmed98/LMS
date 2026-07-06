"use client";

import AdminLayout from "@/components/AdminLayout";
import { permissionModules, roleActivityLog } from "@/lib/admin-panel-data";
import { useTranslations } from "next-intl";
import { Check, Plus, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";

export default function RolesActionPage() {
  const t = useTranslations("adminRolesPage");
  const tAdmin = useTranslations("admin");
  const columns = [
    t("permissions.view"),
    t("permissions.create"),
    t("permissions.edit"),
    t("permissions.delete"),
    t("permissions.export"),
  ];
  const initialRoles = [
    t("roles.superAdmin"),
    t("roles.courseManager"),
    t("roles.examiner"),
    t("roles.reportViewer"),
  ];
  const [roles, setRoles] = useState(initialRoles);
  const [activeRole, setActiveRole] = useState(t("roles.courseManager"));
  const [matrix, setMatrix] = useState(permissionModules);
  const [users, setUsers] = useState(["A. Karim", "S. Rahman", "T. Chowdhury"]);
  const [newUser, setNewUser] = useState("");
  const [logs, setLogs] = useState(roleActivityLog);

  const assignedUsers = useMemo(() => users.join(", "), [users]);

  function togglePermission(module: string, index: number) {
    setMatrix((current) =>
      current.map((row) =>
        row.module === module
          ? {
              ...row,
              values: row.values.map((value, valueIndex) =>
                valueIndex === index ? (value === "yes" ? "no" : "yes") : value,
              ),
            }
          : row,
      ),
    );
    setLogs((current) => [
      `${activeRole} ${module} ${columns[index]} ${t("logs.permissionToggled")}`,
      ...current,
    ]);
  }

  return (
    <AdminLayout title={tAdmin("rolesPermissions")}>
      <div className="grid gap-6 p-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-card-foreground">
              {t("roles.title")}
            </h1>
            <button
              onClick={() => {
                const role = `${t("roles.customRole")} ${roles.length + 1}`;
                setRoles((current) => [role, ...current]);
                setActiveRole(role);
                setLogs((current) => [
                  `${role} ${t("logs.added")}`,
                  ...current,
                ]);
              }}
              className="rounded-lg bg-primary p-2 text-primary-foreground"
              aria-label={t("actions.addRole")}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm font-semibold ${activeRole === role ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}
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
              <p className="text-sm font-semibold text-primary">
                {t("permissions.matrixTitle")}
              </p>
              <h2 className="text-xl font-bold text-card-foreground">
                {activeRole}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-190">
                <thead className="border-b border-border bg-muted/70">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      {t("permissions.module")}
                    </th>
                    {columns.map((column) => (
                      <th
                        key={column}
                        className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matrix.map((row) => (
                    <tr key={row.module}>
                      <td className="px-4 py-4 text-sm font-semibold">
                        {row.module}
                      </td>
                      {row.values.map((value, index) => (
                        <td
                          key={`${row.module}-${columns[index]}`}
                          className="px-4 py-4 text-center"
                        >
                          <button
                            onClick={() => togglePermission(row.module, index)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${value === "yes" ? "border-green-200 bg-green-50 text-green-700" : "border-border bg-background text-muted-foreground"}`}
                          >
                            {value === "yes" ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
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
              <h2 className="font-semibold text-card-foreground">
                {t("assignedUsers.title")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {assignedUsers}
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  value={newUser}
                  onChange={(event) => setNewUser(event.target.value)}
                  placeholder={t("assignedUsers.placeholder")}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={() => {
                    if (!newUser.trim()) return;
                    setUsers((current) => [...current, newUser]);
                    setLogs((current) => [
                      `${newUser} ${t("logs.assignedTo")} ${activeRole}`,
                      ...current,
                    ]);
                    setNewUser("");
                  }}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                >
                  {t("actions.assign")}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-card-foreground">
                {t("activityLog.title")}
              </h2>
              <div className="mt-3 max-h-52 space-y-3 overflow-auto">
                {logs.map((item, index) => (
                  <p
                    key={`${item}-${index}`}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground"
                  >
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
