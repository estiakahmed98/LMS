"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Award,
  BookOpen,
  FileText,
  LayoutDashboard,
  LibraryBig,
  Menu,
  Settings,
  Video,
  X,
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
  {
    href: "/dashboard",
    labelKey: "common.dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/courses",
    labelKey: "learner.myCourses",
    icon: BookOpen,
  },
  {
    href: "/live-classes",
    labelKey: "learner.liveClasses",
    icon: Video,
  },
  {
    href: "/assessments",
    labelKey: "admin.assessments",
    icon: FileText,
  },
  {
    href: "/question-bank",
    labelKey: "admin.questionBank",
    icon: LibraryBig,
  },
  {
    href: "/certificates",
    labelKey: "admin.certificates",
    icon: Award,
  },
  {
    href: "/settings",
    labelKey: "common.settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [logo, setLogo] = useState(
    COLOR_THEME_META[DEFAULT_COLOR_THEME].logo,
  );

  useEffect(() => {
    setLogo(COLOR_THEME_META[getStoredColorTheme()].logo);

    return subscribeColorThemeChanges((theme) => {
      setLogo(COLOR_THEME_META[theme].logo);
    });
  }, []);

  // Route change হলে mobile drawer বন্ধ হবে
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Escape key press করলে drawer বন্ধ হবে
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Drawer open থাকলে background scroll বন্ধ থাকবে
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

  const sidebarContent = (
    <>
      <div className="flex min-h-[88px] items-center justify-between border-b border-border px-4 py-4 sm:px-5 md:border-b-0 md:px-6 md:py-6">
        <Link
          href="/dashboard"
          onClick={() => setIsMobileOpen(false)}
          className="inline-flex items-center"
        >
          <Image
            src={logo}
            alt="PSTC LMS"
            width={72}
            height={72}
            className="h-12 w-auto object-contain sm:h-14 md:h-[72px]"
          />
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close sidebar"
          className="flex size-10 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted md:hidden"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 md:py-0">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors sm:px-4 sm:py-3 ${
                isActive
                  ? "bg-primary/10"
                  : "hover:bg-muted"
              }`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/10 text-muted-foreground"
                }`}
              >
                <Icon className="size-4" />
              </span>

              <span
                className={`text-sm ${
                  isActive
                    ? "font-bold text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground md:border-t-0 md:px-6">
        PSTC LMS v1.0
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
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-muted/50 md:flex xl:w-60 print:hidden">
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
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[86%] max-w-[320px] flex-col border-r border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out md:hidden print:hidden ${
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
