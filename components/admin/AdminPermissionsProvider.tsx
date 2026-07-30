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

export const ADMIN_PERMISSIONS_UPDATED_EVENT = "admin-permissions-updated";
export const ADMIN_PERMISSIONS_UPDATED_KEY = "admin-permissions-updated";

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

let cachedRole: string | null = null;
let cachedPermissions: ClientPermissionGrant[] | null = null;
let cachedAt = 0;

function hasFreshCache() {
  return (
    cachedPermissions !== null &&
    Date.now() - cachedAt < 5 * 60 * 1000
  );
}

function usePermissionState(enabled = true): AdminPermissionsContextValue {
  const [loading, setLoading] = useState(enabled && !hasFreshCache());
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(cachedRole);
  const [permissions, setPermissions] = useState<ClientPermissionGrant[]>(
    cachedPermissions ?? [],
  );

  const reload = useCallback(async (options?: { background?: boolean }) => {
    if (!enabled) return;

    if (!options?.background) {
      setLoading(true);
    }
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
      cachedRole = data.role ?? null;
      cachedPermissions = data.permissions ?? [];
      cachedAt = Date.now();
      setRole(cachedRole);
      setPermissions(cachedPermissions);
    } catch (caught) {
      if (!cachedPermissions) {
        setRole(null);
        setPermissions([]);
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to load permissions.",
      );
    } finally {
      if (!options?.background) {
        setLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void reload({ background: hasFreshCache() });
  }, [enabled, reload]);

  useEffect(() => {
    if (!enabled) return;

    function refreshIfVisible() {
      if (document.visibilityState === "visible") {
        void reload({ background: true });
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === ADMIN_PERMISSIONS_UPDATED_KEY) {
        void reload({ background: true });
      }
    }

    window.addEventListener(ADMIN_PERMISSIONS_UPDATED_EVENT, refreshIfVisible);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        ADMIN_PERMISSIONS_UPDATED_EVENT,
        refreshIfVisible,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [enabled, reload]);

  return useMemo<AdminPermissionsContextValue>(() => {
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
}

export function AdminPermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = usePermissionState();

  return (
    <AdminPermissionsContext.Provider value={value}>
      {children}
    </AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions() {
  const context = useContext(AdminPermissionsContext);
  const fallback = usePermissionState(!context);
  return context ?? fallback;
}
