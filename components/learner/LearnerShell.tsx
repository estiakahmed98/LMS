import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import type { PermissionModule } from "@/lib/generated/prisma/enums";

interface LearnerShellProps {
  user?: { name: string };
  visibleModules?: PermissionModule[];
  children: React.ReactNode;
}

export default function LearnerShell({
  user,
  visibleModules,
  children,
}: LearnerShellProps) {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar visibleModules={visibleModules} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} />
        <main className="flex-1 p-2 md:p-4 w-full">{children}</main>
      </div>
    </div>
  );
}
