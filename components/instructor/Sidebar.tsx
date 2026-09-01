"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import TransitionLink from "@/components/navigation/TransitionLink";
import {
  Award,
  BarChart3,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  ShieldCheck,
  Video,
  PlayCircle,
  CalendarClock,
  BookOpen,
  Users,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  COLOR_THEME_META,
  DEFAULT_COLOR_THEME,
  getStoredColorTheme,
  subscribeColorThemeChanges,
} from "@/lib/color-theme";
import type { PermissionModule } from "@/lib/generated/prisma/enums";
import { usePortalPermissions } from "@/components/portal/PortalPermissionsProvider";

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  module?: PermissionModule;
}

const navItems: NavItem[] = [
  {
    href: "/instructor/dashboard",
    labelKey: "instructor.dashboard",
    icon: LayoutDashboard,
    module: "COURSES",
  },
  {
    href: "/instructor/students",
    labelKey: "admin.students",
    icon: Users,
    module: "STUDENTS",
  },
  {
    href: "/instructor/classes",
    labelKey: "instructor.myTeachingClasses",
    icon: Video,
    module: "COURSES",
  },
  {
    href: "/instructor/courses",
    labelKey: "admin.courses",
    icon: BookOpen,
    module: "COURSES",
  },
  {
    href: "/instructor/recordings",
    labelKey: "instructor.recordings",
    icon: PlayCircle,
    module: "COURSES",
  },
  {
    href: "/instructor/schedule",
    labelKey: "instructor.teachingSchedule",
    icon: CalendarClock,
    module: "COURSES",
  },
  {
    href: "/instructor/assessments",
    labelKey: "admin.assessments",
    icon: ClipboardCheck,
    module: "ASSESSMENTS",
  },
  {
    href: "/instructor/question-bank",
    labelKey: "admin.questionBank",
    icon: LibraryBig,
    module: "QUESTION_BANK",
  },
  {
    href: "/instructor/submissions",
    labelKey: "admin.submissions",
    icon: FileCheck2,
    module: "SUBMISSIONS",
  },
  {
    href: "/instructor/grading",
    labelKey: "admin.grading",
    icon: GraduationCap,
    module: "GRADING",
  },
  {
    href: "/instructor/certificates",
    labelKey: "admin.certificates",
    icon: Award,
    module: "CERTIFICATES",
  },
  {
    href: "/instructor/reports",
    labelKey: "admin.reports",
    icon: BarChart3,
    module: "REPORTS",
  },
  {
    href: "/instructor/participants",
    labelKey: "instructor.participants",
    icon: Users,
    module: "REPORTS",
  },
  {
    href: "/instructor/settings",
    labelKey: "common.settings",
    icon: Settings,
    module: "SETTINGS",
  },
  {
    href: "/instructor/roles",
    labelKey: "admin.roles",
    icon: ShieldCheck,
    module: "ROLES",
  },
];

interface InstructorSidebarProps {
  /** Controls the mobile drawer; ignored above the md breakpoint where the sidebar is always visible. */
  isOpen?: boolean;
  onClose?: () => void;
}

export default function InstructorSidebar({
  isOpen = false,
  onClose,
}: InstructorSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const { permissions } = usePortalPermissions();
  const visibleModules: PermissionModule[] = permissions
    .filter((permission) => permission.canView)
    .map((permission) => permission.module);
  const [logo, setLogo] = useState(COLOR_THEME_META[DEFAULT_COLOR_THEME].logo);

  useEffect(() => {
    setLogo(COLOR_THEME_META[getStoredColorTheme()].logo);

    return subscribeColorThemeChanges((theme) => {
      setLogo(COLOR_THEME_META[theme].logo);
    });
  }, []);

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const visibleNavItems = navItems.filter(
    (item) =>
      !item.module || !visibleModules || visibleModules.includes(item.module),
  );

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between gap-3 px-6 py-6">
        <span className="text-xl font-bold">
          <Image src={logo} alt="BOED LMS" width={160} height={72} className="h-18 w-auto" />
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted md:hidden"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 space-y-1">
        {visibleNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <TransitionLink
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive ? "bg-primary/10" : "hover:bg-muted"
              }`}
            >
              <span
                className={`flex items-center justify-center w-8 h-8 rounded-md ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/10 text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span
                className={`text-sm ${isActive ? "font-bold text-primary" : "text-muted-foreground"}`}
              >
                {t(item.labelKey)}
              </span>
            </TransitionLink>
          );
        })}
      </nav>

      <div className="px-6 py-4 text-xs text-muted-foreground">
        BOED LMS v1.0
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0 bg-muted/50 border-r border-border">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 md:hidden print:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Mobile drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[86%] max-w-[320px] flex-col border-r border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out md:hidden print:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
