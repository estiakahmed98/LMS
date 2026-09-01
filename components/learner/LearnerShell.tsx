"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { PortalPermissionsProvider } from "@/components/portal/PortalPermissionsProvider";
import type { PermissionGrant } from "@/lib/rbac-permissions";
import { RouteTransitionSkeleton } from "@/components/providers/RouteTransitionProvider";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <PortalPermissionsProvider permissions={permissions} user={user}>
      <div className="min-h-screen flex bg-background">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            user={user}
            notificationsPath="/api/learner/notifications"
            onMenuClick={() => setIsSidebarOpen(true)}
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
