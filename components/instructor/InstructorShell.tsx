import Sidebar from "./Sidebar";
import Topbar from "@/components/learner/Topbar";
import type { PermissionModule } from "@/lib/generated/prisma/enums";

interface InstructorShellProps {
  user?: { name: string; photoUrl?: string | null };
  visibleModules?: PermissionModule[];
  children: React.ReactNode;
}

export default function InstructorShell({
  user,
  visibleModules,
  children,
}: InstructorShellProps) {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar visibleModules={visibleModules} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={user}
          settingsPath="/instructor/settings"
          notificationsPath="/api/instructor/notifications"
        />
        <main className="flex-1 p-2 md:p-4 w-full">{children}</main>
      </div>
    </div>
  );
}
