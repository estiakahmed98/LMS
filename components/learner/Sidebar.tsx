"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Award,
  Settings,
  type LucideIcon,
} from "lucide-react";
import {
  COLOR_THEME_META,
  DEFAULT_COLOR_THEME,
  getStoredColorTheme,
  subscribeColorThemeChanges,
} from "@/lib/color-theme";

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "common.dashboard", icon: LayoutDashboard },
  { href: "/courses", labelKey: "learner.myCourses", icon: BookOpen },
  { href: "/assessments", labelKey: "admin.assessments", icon: FileText },
  { href: "/certificates", labelKey: "admin.certificates", icon: Award },
  { href: "/settings", labelKey: "common.settings", icon: Settings },
];

export default function Sidebar() {
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
          <img src={logo} alt="PSTC LMS" className="h-18" />
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
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
        PSTC LMS v1.0
      </div>
    </aside>
  );
}
