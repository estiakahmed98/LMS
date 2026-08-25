"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  AnimatePresence,
  motion,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/auth";
import {
  DEFAULT_LOCALE,
  getStoredLocale,
  setStoredLocale,
  subscribeLocaleChanges,
  type Locale,
} from "@/lib/locale";
import { GradientButton } from "./GradientButton";

const links = [
  { href: "#features", label: "Features" },
  { href: "#showcase", label: "Solutions" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const ADMIN_ROLES = new Set([
  "SUPER_ADMIN",
  "COURSE_MANAGER",
  "EXAMINER",
  "REPORT_VIEWER",
]);

function getDashboardPath(role?: string) {
  if (role && ADMIN_ROLES.has(role)) return "/admin/dashboard";
  if (role === "INSTRUCTOR") return "/instructor/dashboard";
  return "/dashboard";
}

function LanguageToggle({ className }: { className?: string }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(getStoredLocale());
    return subscribeLocaleChanges((next) => setLocale(next));
  }, []);

  function toggle() {
    setStoredLocale(locale === "en" ? "bn" : "en");
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted",
        className,
      )}
      aria-label="Toggle language"
    >
      <span
        className={
          locale === "en" ? "text-foreground" : "text-muted-foreground"
        }
      >
        EN
      </span>
      <span className="text-muted-foreground">/</span>
      <span
        className={
          locale === "bn" ? "text-foreground" : "text-muted-foreground"
        }
      >
        বাং
      </span>
    </button>
  );
}

function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted",
        className,
      )}
      aria-label="Toggle theme"
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const { scrollY } = useScroll();
  const dashboardPath = getDashboardPath(session?.user?.role);
  const displayName = session?.user?.name?.trim() || "Account";

  const accountLink = (mobile = false) => {
    if (status === "loading") {
      return (
        <span
          className="size-10 animate-pulse rounded-full bg-muted"
          aria-label="Loading account"
        />
      );
    }

    if (!session?.user) {
      return (
        <Link
          href="/login"
          onClick={mobile ? () => setMenuOpen(false) : undefined}
          className={cn(
            "font-medium transition-colors hover:text-foreground",
            mobile
              ? "text-base text-muted-foreground"
              : "text-sm text-foreground/80",
          )}
        >
          Login
        </Link>
      );
    }

    return (
      <Link
        href={dashboardPath}
        onClick={mobile ? () => setMenuOpen(false) : undefined}
        className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Go to ${displayName}'s dashboard`}
        title={`${displayName} — Dashboard`}
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          getInitials(displayName) || "U"
        )}
      </Link>
    );
  };

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 24);
  });

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "mx-auto mt-3 flex max-w-[90vw] items-center justify-between rounded-2xl px-4 py-3 transition-all duration-300 sm:px-6",
          scrolled
            ? "border border-border/60 bg-background/70 shadow-lg shadow-black/5 backdrop-blur-xl"
            : "border border-transparent bg-transparent",
        )}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/logo boed 3.png"
            alt="BOED LMS"
            width={32}
            height={32}
            className="h-8 w-8 rounded-md object-contain"
          />
          <span className="text-lg font-bold text-foreground">
            BOED <span className="text-primary">LMS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageToggle />
          <ThemeToggle />
          {accountLink()}
          <GradientButton href="/enroll" className="px-5! py-2! text-sm">
            Request a Demo
          </GradientButton>
        </div>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted md:hidden"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 top-0 z-40 bg-background/98 backdrop-blur-xl md:hidden"
          >
            <div className="flex h-full flex-col items-center justify-center gap-8 px-6">
              {links.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.4 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-2xl font-semibold text-foreground"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="flex flex-col items-center gap-4 pt-4"
              >
                <div className="flex items-center gap-3">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
                {accountLink(true)}
                <GradientButton
                  href="/enroll"
                  onClick={() => setMenuOpen(false)}
                >
                  Request a Demo
                </GradientButton>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
