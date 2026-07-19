import Sidebar from "./Sidebar";
import Topbar from "@/components/learner/Topbar";
import { PortalPermissionsProvider } from "@/components/portal/PortalPermissionsProvider";
import type { PermissionGrant } from "@/lib/rbac-permissions";

interface InstructorShellProps {
  user?: { name: string; photoUrl?: string | null };
  permissions: PermissionGrant[];
  children: React.ReactNode;
}

export default function InstructorShell({
  user,
  permissions,
  children,
}: InstructorShellProps) {
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
            settingsPath="/instructor/settings"
            notificationsPath={
              permissions.some(
                (permission) =>
                  permission.module === "SETTINGS" && permission.canView,
              )
                ? "/api/instructor/notifications"
                : undefined
            }
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
