"use client";

import { Toaster } from "sonner";
import AdminSidebar from "./AdminSidebar";
import TopNav from "./TopNav";
import AdminAccessGuard from "@/components/admin/AdminAccessGuard";
import {
  AdminPermissionsProvider,
  useAdminPermissions,
} from "@/components/admin/AdminPermissionsProvider";
import { usePathname } from "next/navigation";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

function PermissionAwareLayout({ children, title }: AdminLayoutProps) {
  const pathname = usePathname();
  const { loading } = useAdminPermissions();

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
    <div className="flex h-screen overflow-hidden bg-background print:h-auto print:overflow-visible">
      <Toaster richColors position="top-right" />
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <TopNav title={title} showLogo={false} />
        <main className="min-h-0 flex-1 overflow-y-auto print:h-auto print:overflow-visible">
          <AdminAccessGuard>{children}</AdminAccessGuard>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout(props: AdminLayoutProps) {
  return (
    <AdminPermissionsProvider>
      <PermissionAwareLayout {...props} />
    </AdminPermissionsProvider>
  );
}
