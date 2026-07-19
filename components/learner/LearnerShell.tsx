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
    <PortalPermissionsProvider permissions={permissions} user={user}>
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar user={user} />
          <main className="flex-1 p-2 md:p-4 w-full">{children}</main>
        </div>
      </div>
    </PortalPermissionsProvider>
  );
}
