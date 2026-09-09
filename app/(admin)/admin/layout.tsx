import { AdminLayoutShell } from "@/components/AdminLayout";
import AdminSWRProvider from "@/components/providers/AdminSWRProvider";

export default function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminSWRProvider>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AdminSWRProvider>
  );
}
