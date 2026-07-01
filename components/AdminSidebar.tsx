"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  BarChart3,
  CheckCircle2,
  Award,
  Bell,
  Lock,
  Settings,
} from "lucide-react";

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/assessments/build", label: "Assessments", icon: FileText },
  { href: "/admin/submissions", label: "Submissions", icon: CheckCircle2 },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/certificates", label: "Certificates", icon: Award },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/roles", label: "Roles & Permissions", icon: Lock },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-sidebar text-sidebar-foreground min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <img src="/pstc_logo.png" alt="PSTC LMS" className="h-18" />
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "hover:bg-sidebar-accent text-sidebar-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60">PSTC LMS v1.0</p>
      </div>
    </aside>
  );
}
