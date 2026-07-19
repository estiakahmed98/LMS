"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Video,
  PlayCircle,
  CalendarClock,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import {
  COLOR_THEME_META,
  DEFAULT_COLOR_THEME,
  getStoredColorTheme,
  subscribeColorThemeChanges,
} from "@/lib/color-theme";
import type { PermissionModule } from "@/lib/generated/prisma/enums";

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
    href: "/instructor/classes",
    labelKey: "instructor.myTeachingClasses",
    icon: Video,
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
];

export default function InstructorSidebar({
  visibleModules,
}: {
  visibleModules?: PermissionModule[];
}) {
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
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0 bg-muted/50 border-r border-border">
      <div className="px-6 py-6">
        <span className="text-xl font-bold">
          <Image src={logo} alt="BOED LMS" width={160} height={72} className="h-18 w-auto" />
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems
          .filter(
            (item) =>
              !item.module ||
              !visibleModules ||
              visibleModules.includes(item.module),
          )
          .map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
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
            </Link>
          );
          })}
      </nav>

      <div className="px-6 py-4 text-xs text-muted-foreground">
        BOED LMS v1.0
      </div>
    </aside>
  );
}
