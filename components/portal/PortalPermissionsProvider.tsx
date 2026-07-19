"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { PermissionModule } from "@/lib/generated/prisma/enums";
import type {
  PermissionAction,
  PermissionGrant,
} from "@/lib/rbac-permissions";
import { hasModulePermission } from "@/lib/rbac-permissions";

interface PortalPermissionsContextValue {
  permissions: PermissionGrant[];
  can: (module: PermissionModule, action?: PermissionAction) => boolean;
}

const PortalPermissionsContext =
  createContext<PortalPermissionsContextValue | null>(null);

export function PortalPermissionsProvider({
  permissions,
  children,
}: {
  permissions: PermissionGrant[];
  children: ReactNode;
}) {
  const can = useCallback(
    (module: PermissionModule, action: PermissionAction = "view") =>
      hasModulePermission(permissions, module, action),
    [permissions],
  );

  const value = useMemo(() => ({ permissions, can }), [permissions, can]);

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
