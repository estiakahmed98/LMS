"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  ClipboardCheck,
  BarChart3,
  CheckCircle2,
  Award,
  Bell,
  Lock,
  Settings,
  Video,
  UserCog,
  PlayCircle,
  History,
  LibraryBig,
} from "lucide-react";
import {
  COLOR_THEME_META,
  DEFAULT_COLOR_THEME,
  getStoredColorTheme,
  subscribeColorThemeChanges,
} from "@/lib/color-theme";

const menuItems = [
  {
    href: "/admin/dashboard",
    labelKey: "common.dashboard",
    icon: LayoutDashboard,
  },
  { href: "/admin/users", labelKey: "admin.students", icon: Users },
  { href: "/admin/courses", labelKey: "admin.courses", icon: BookOpen },
  { href: "/admin/assessments", labelKey: "admin.assessments", icon: FileText },
  {
    href: "/admin/question-bank",
    labelKey: "admin.questionBank",
    icon: LibraryBig,
  },
  { href: "/admin/classes", labelKey: "admin.classManagement", icon: Video },
  {
    href: "/admin/instructors",
    labelKey: "admin.instructorManagement",
    icon: UserCog,
  },
  { href: "/admin/recordings", labelKey: "admin.recordings", icon: PlayCircle },
  {
    href: "/admin/submissions",
    labelKey: "admin.submissions",
    icon: CheckCircle2,
  },
  { href: "/admin/grading", labelKey: "admin.grading", icon: ClipboardCheck },
  { href: "/admin/reports", labelKey: "admin.reports", icon: BarChart3 },
  { href: "/admin/certificates", labelKey: "admin.certificates", icon: Award },
  { href: "/admin/notifications", labelKey: "admin.notifications", icon: Bell },
  { href: "/admin/roles", labelKey: "admin.rolesPermissions", icon: Lock },
  { href: "/admin/activity-log", labelKey: "admin.activityLog", icon: History },
  { href: "/admin/settings", labelKey: "common.settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations();
  const [logo, setLogo] = useState(COLOR_THEME_META[DEFAULT_COLOR_THEME].logo);

  useEffect(() => {
    setLogo(COLOR_THEME_META[getStoredColorTheme()].logo);

    return subscribeColorThemeChanges((theme) => {
      setLogo(COLOR_THEME_META[theme].logo);
    });
  }, []);

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-sidebar text-sidebar-foreground print:hidden">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border shrink-0">
        <img src={logo} alt="BOED LMS" className="h-18" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
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
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="shrink-0 p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60">BOED LMS v1.0</p>
      </div>
    </aside>
  );
}
