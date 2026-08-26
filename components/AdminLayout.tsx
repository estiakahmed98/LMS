"use client";

import AdminSidebar from "./AdminSidebar";
import TopNav from "./TopNav";
import AdminAccessGuard from "@/components/admin/AdminAccessGuard";
import {
  AdminPermissionsProvider,
  useAdminPermissions,
} from "@/components/admin/AdminPermissionsProvider";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { RouteTransitionSkeleton } from "@/components/providers/RouteTransitionProvider";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

interface AdminShellContextValue {
  setTitle: (title?: string) => void;
}

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

function PermissionAwareShell({
  children,
  title,
}: Required<Pick<AdminLayoutProps, "children">> &
  Pick<AdminLayoutProps, "title">) {
  const pathname = usePathname();
  const { loading } = useAdminPermissions();
  const [currentTitle, setCurrentTitle] = useState(title);

  const contextValue = useMemo(
    () => ({
      setTitle: (nextTitle?: string) => {
        setCurrentTitle(nextTitle);
      },
    }),
    [],
  );

  if (pathname.startsWith("/instructor")) {
    return <AdminAccessGuard>{children}</AdminAccessGuard>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <AdminShellContext.Provider value={contextValue}>
      <div className="flex h-screen overflow-hidden bg-background print:h-auto print:overflow-visible">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col print:block">
          <TopNav title={currentTitle} showLogo={false} />
          <main className="relative min-h-0 flex-1 overflow-y-auto print:h-auto print:overflow-visible">
            <AdminAccessGuard>{children}</AdminAccessGuard>
            <RouteTransitionSkeleton />
          </main>
        </div>
      </div>
    </AdminShellContext.Provider>
  );
}

export function AdminLayoutShell(props: AdminLayoutProps) {
  return (
    <AdminPermissionsProvider>
      <PermissionAwareShell {...props} />
    </AdminPermissionsProvider>
  );
}

function NestedAdminLayout({ children, title }: AdminLayoutProps) {
  const shell = useContext(AdminShellContext);

  useEffect(() => {
    shell?.setTitle(title);
    return () => {
      shell?.setTitle(undefined);
    };
  }, [shell, title]);

  return <>{children}</>;
}

export default function AdminLayout(props: AdminLayoutProps) {
  const shell = useContext(AdminShellContext);

  if (shell) {
    return <NestedAdminLayout {...props} />;
  }

  return <AdminLayoutShell {...props} />;
}
