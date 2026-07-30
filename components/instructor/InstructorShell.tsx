import Sidebar from "./Sidebar";
import Topbar from "@/components/learner/Topbar";
import { PortalPermissionsProvider } from "@/components/portal/PortalPermissionsProvider";
import type { PermissionGrant } from "@/lib/rbac-permissions";
import { RouteTransitionSkeleton } from "@/components/providers/RouteTransitionProvider";

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
    <PortalPermissionsProvider permissions={permissions} user={user}>
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            user={user}
            settingsPath="/instructor/settings"
            notificationsPath="/api/instructor/notifications"
          />
          <main className="relative flex-1 w-full p-2 md:p-4">
            {children}
            <RouteTransitionSkeleton />
          </main>
        </div>
      </div>
    </PortalPermissionsProvider>
  );
}
