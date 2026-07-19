"use client";

import {
  Eye,
  FilePlus2,
  Pencil,
  Trash2,
  Download,
  ShieldCheck,
} from "lucide-react";
import type { PermissionModule } from "@/lib/generated/prisma/enums";
import {
  usePortalPermissions,
} from "@/components/portal/PortalPermissionsProvider";
import type { PermissionAction } from "@/lib/rbac-permissions";
import type { PortalModuleData } from "@/lib/portal-module-map";

const ACTIONS: Array<{
  action: PermissionAction;
  label: string;
  icon: typeof Eye;
}> = [
  { action: "view", label: "View", icon: Eye },
  { action: "create", label: "Create", icon: FilePlus2 },
  { action: "edit", label: "Edit", icon: Pencil },
  { action: "delete", label: "Delete", icon: Trash2 },
  { action: "export", label: "Export", icon: Download },
];

export default function PortalModuleAccessPage({
  module,
  title,
  description,
  data,
}: {
  module: PermissionModule;
  title: string;
  description: string;
  data: PortalModuleData;
}) {
  const { can } = usePortalPermissions();

  function exportRows() {
    if (!can(module, "export") || data.rows.length === 0) return;
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [
      data.columns.map(escape).join(","),
      ...data.rows.map((row) => row.values.map(escape).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${module.toLowerCase()}-export.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {ACTIONS.map(({ action, label, icon: Icon }) => {
          const allowed = can(module, action);
          return (
            <div
              key={action}
              className={`rounded-xl border p-4 ${
                allowed
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/30"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  allowed ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <p className="mt-3 text-sm font-semibold">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {allowed ? "Allowed by role permission" : "Not allowed"}
              </p>
            </div>
          );
        })}
      </div>

      {data.columns.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Scoped records</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Only records allowed for this account are shown.
                </p>
              </div>
              {can(module, "export") && (
                <button
                  type="button"
                  onClick={exportRows}
                  disabled={data.rows.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {data.columns.map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((row) => (
                  <tr key={row.id}>
                    {row.values.map((value, index) => (
                      <td
                        key={`${row.id}-${data.columns[index]}`}
                        className="max-w-90 px-4 py-3 text-card-foreground"
                      >
                        <span className="line-clamp-2">{value}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.rows.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No records are available in your scope.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
