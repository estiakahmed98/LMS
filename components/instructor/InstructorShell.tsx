"use client";

import { useState } from "react";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <PortalPermissionsProvider permissions={permissions} user={user}>
      <div className="flex min-h-screen bg-background print:block print:min-h-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col print:block">
          <Topbar
            user={user}
            settingsPath="/instructor/settings"
            notificationsPath="/api/instructor/notifications"
            onMenuClick={() => setIsSidebarOpen(true)}
          />
          <main className="relative w-full flex-1 p-2 print:p-0 md:p-4">
            {children}
            <RouteTransitionSkeleton />
          </main>
        </div>
      </div>
    </PortalPermissionsProvider>
  );
}
