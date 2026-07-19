"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { PermissionModule } from "@/lib/generated/prisma/enums";
import type {
  PermissionAction,
  PermissionGrant,
} from "@/lib/rbac-permissions";
import { hasModulePermission } from "@/lib/rbac-permissions";

export const PORTAL_PERMISSIONS_UPDATED_KEY = "portal-permissions-updated";

interface PortalUser {
  name: string;
  photoUrl?: string | null;
}

interface PortalPermissionsContextValue {
  permissions: PermissionGrant[];
  user?: PortalUser;
  can: (module: PermissionModule, action?: PermissionAction) => boolean;
}

const PortalPermissionsContext =
  createContext<PortalPermissionsContextValue | null>(null);

export function PortalPermissionsProvider({
  permissions,
  user,
  children,
}: {
  permissions: PermissionGrant[];
  user?: PortalUser;
  children: ReactNode;
}) {
  const router = useRouter();
  const [currentPermissions, setCurrentPermissions] = useState(permissions);
  const can = useCallback(
    (module: PermissionModule, action: PermissionAction = "view") =>
      hasModulePermission(currentPermissions, module, action),
    [currentPermissions],
  );

  const value = useMemo(
    () => ({ permissions: currentPermissions, user, can }),
    [currentPermissions, user, can],
  );

  useEffect(() => {
    setCurrentPermissions(permissions);
  }, [permissions]);

  useEffect(() => {
    let cancelled = false;

    async function refreshPermissions() {
      try {
        const response = await fetch("/api/portal/permissions", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          permissions?: PermissionGrant[];
        };
        if (!data.permissions || cancelled) return;

        setCurrentPermissions((current) => {
          if (JSON.stringify(current) === JSON.stringify(data.permissions)) {
            return current;
          }
          queueMicrotask(() => router.refresh());
          return data.permissions as PermissionGrant[];
        });
      } catch {
        // Keep the last server-provided permissions on transient failures.
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === PORTAL_PERMISSIONS_UPDATED_KEY) {
        void refreshPermissions();
      }
    }

    window.addEventListener("storage", handleStorage);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshPermissions();
      }
    }, 15_000);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(intervalId);
    };
  }, [router]);

  return (
    <PortalPermissionsContext.Provider value={value}>
      {children}
    </PortalPermissionsContext.Provider>
  );
}

export function usePortalPermissions() {
  const context = useContext(PortalPermissionsContext);
  if (!context) {
    throw new Error(
      "usePortalPermissions must be used inside PortalPermissionsProvider.",
    );
  }
  return context;
}

export function PortalAccessGuard({
  module,
  action = "view",
  children,
  fallback = null,
}: {
  module: PermissionModule;
  action?: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = usePortalPermissions();
  return can(module, action) ? children : fallback;
}
