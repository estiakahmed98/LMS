"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PermissionModuleValue } from "@/lib/admin-role-types";
import { parseApiJson } from "@/lib/parse-api-json";

interface ClientPermissionGrant {
  module: PermissionModuleValue;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

interface AdminPermissionsContextValue {
  loading: boolean;
  error: string | null;
  role: string | null;
  permissions: ClientPermissionGrant[];
  can: (
    module: PermissionModuleValue,
    action: "view" | "create" | "edit" | "delete" | "export",
  ) => boolean;
  reload: () => Promise<void>;
}

const AdminPermissionsContext =
  createContext<AdminPermissionsContextValue | null>(null);

const actionFields = {
  view: "canView",
  create: "canCreate",
  edit: "canEdit",
  delete: "canDelete",
  export: "canExport",
} as const;

export function AdminPermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<ClientPermissionGrant[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/me/permissions", {
        cache: "no-store",
      });
      const data = await parseApiJson<{
        role?: string;
        permissions?: ClientPermissionGrant[];
        error?: string;
      }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load permissions.");
      }
      setRole(data.role ?? null);
      setPermissions(data.permissions ?? []);
    } catch (caught) {
      setRole(null);
      setPermissions([]);
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to load permissions.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<AdminPermissionsContextValue>(() => {
    const byModule = new Map(
      permissions.map((permission) => [permission.module, permission]),
    );

    return {
      loading,
      error,
      role,
      permissions,
      can: (module, action) =>
        Boolean(byModule.get(module)?.[actionFields[action]]),
      reload,
    };
  }, [error, loading, permissions, reload, role]);

  return (
    <AdminPermissionsContext.Provider value={value}>
      {children}
    </AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions() {
  const context = useContext(AdminPermissionsContext);
  if (!context) {
    throw new Error(
      "useAdminPermissions must be used inside AdminPermissionsProvider.",
    );
  }
  return context;
}
