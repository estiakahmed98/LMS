import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { PortalPermissionsProvider } from "@/components/portal/PortalPermissionsProvider";
import type { PermissionGrant } from "@/lib/rbac-permissions";

interface LearnerShellProps {
  user?: { name: string };
  permissions: PermissionGrant[];
  children: React.ReactNode;
}

export default function LearnerShell({
  user,
  permissions,
  children,
}: LearnerShellProps) {
  return (
    <PortalPermissionsProvider permissions={permissions}>
      <div className="min-h-screen flex bg-background">
        <Sidebar
          visibleModules={permissions
            .filter((permission) => permission.canView)
            .map((permission) => permission.module)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            user={user}
            showSettings={permissions.some(
              (permission) =>
                permission.module === "SETTINGS" && permission.canView,
            )}
            canEditSettings={permissions.some(
              (permission) =>
                permission.module === "SETTINGS" && permission.canEdit,
            )}
          />
          <main className="flex-1 p-2 md:p-4 w-full">{children}</main>
        </div>
      </div>
    </PortalPermissionsProvider>
  );
}
