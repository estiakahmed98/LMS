"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import TransitionLink from "@/components/navigation/TransitionLink";
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
  Menu,
  Settings,
  Video,
  UserCog,
  PlayCircle,
  History,
  LibraryBig,
  Layers3,
  X,
} from "lucide-react";
import {
  COLOR_THEME_META,
  DEFAULT_COLOR_THEME,
  getStoredColorTheme,
  subscribeColorThemeChanges,
} from "@/lib/color-theme";
import type { PermissionModuleValue } from "@/lib/admin-role-types";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";

interface MenuItem {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  module?: PermissionModuleValue;
}

const menuItems: MenuItem[] = [
  {
    href: "/admin/dashboard",
    labelKey: "common.dashboard",
    icon: LayoutDashboard,
    module: "REPORTS",
  },
  { href: "/admin/users", labelKey: "admin.students", icon: Users, module: "STUDENTS" },
  { href: "/admin/courses", labelKey: "admin.courses", icon: BookOpen, module: "COURSES" },
  { href: "/admin/cohorts", labelKey: "admin.cohorts", icon: Layers3, module: "COURSES" },
  { href: "/admin/assessments", labelKey: "admin.assessments", icon: FileText, module: "ASSESSMENTS" },
  {
    href: "/admin/question-bank",
    labelKey: "admin.questionBank",
    icon: LibraryBig,
    module: "QUESTION_BANK",
  },
  { href: "/admin/classes", labelKey: "admin.classManagement", icon: Video, module: "COURSES" },
  {
    href: "/admin/instructors",
    labelKey: "admin.instructorManagement",
    icon: UserCog,
    module: "STUDENTS",
  },
  { href: "/admin/recordings", labelKey: "admin.recordings", icon: PlayCircle, module: "COURSES" },
  {
    href: "/admin/submissions",
    labelKey: "admin.submissions",
    icon: CheckCircle2,
    module: "SUBMISSIONS",
  },
  { href: "/admin/grading", labelKey: "admin.grading", icon: ClipboardCheck, module: "GRADING" },
  { href: "/admin/reports", labelKey: "admin.reports", icon: BarChart3, module: "REPORTS" },
  { href: "/admin/certificates", labelKey: "admin.certificates", icon: Award, module: "CERTIFICATES" },
  { href: "/admin/notifications", labelKey: "admin.notifications", icon: Bell, module: "SETTINGS" },
  { href: "/admin/roles", labelKey: "admin.rolesPermissions", icon: Lock, module: "ROLES" },
  { href: "/admin/activity-log", labelKey: "admin.activityLog", icon: History, module: "ROLES" },
  { href: "/admin/settings", labelKey: "common.settings", icon: Settings, module: "SETTINGS" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations();
  const [logo, setLogo] = useState(COLOR_THEME_META[DEFAULT_COLOR_THEME].logo);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { can } = useAdminPermissions();

  useEffect(() => {
    setLogo(COLOR_THEME_META[getStoredColorTheme()].logo);

    return subscribeColorThemeChanges((theme) => {
      setLogo(COLOR_THEME_META[theme].logo);
    });
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (!isMobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const visibleMenuItems = menuItems.filter(
    (item) => !item.module || can(item.module, "view"),
  );

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-sidebar-border p-6">
        <img src={logo} alt="BOED LMS" className="h-18" />
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close sidebar"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-sidebar-border text-sidebar-foreground transition-colors hover:bg-sidebar-accent md:hidden"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href);

          return (
            <TransitionLink
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                  : "hover:bg-sidebar-accent text-sidebar-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{t(item.labelKey)}</span>
            </TransitionLink>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="shrink-0 p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60">BOED LMS v1.0</p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open sidebar"
        aria-expanded={isMobileOpen}
        className="fixed left-4 top-4 z-40 flex size-11 items-center justify-center rounded-xl border border-border bg-background/95 text-foreground shadow-lg backdrop-blur transition-colors hover:bg-muted md:hidden print:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex print:hidden">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <div
        aria-hidden="true"
        onClick={() => setIsMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 md:hidden print:hidden ${
          isMobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Mobile drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[86%] max-w-[320px] flex-col border-r border-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-in-out md:hidden print:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
