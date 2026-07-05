"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Moon, Palette, Settings as SettingsIcon, Sun, User as UserIcon } from "lucide-react";
import { getCurrentUser, getInitials } from "@/lib/auth";

export default function InstructorSettingsPage() {
  const t = useTranslations();
  const currentUser = getCurrentUser();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = useMemo(
    () => getInitials(currentUser?.name ?? t("settingsPage.learner")),
    [currentUser?.name, t],
  );

  const selectedTheme = mounted ? theme : undefined;
  const displayedTheme = mounted
    ? theme === "system"
      ? "system"
      : (resolvedTheme ?? theme)
    : undefined;

  return (
    <div className="p-2 md:p-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-linear-to-r from-primary/10 via-background to-background px-6 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SettingsIcon className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-card-foreground sm:text-3xl">
                {t("common.settings")}
              </h1>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl border border-border bg-background p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                {currentUser?.name ? initials : <UserIcon className="h-7 w-7" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-card-foreground">
                  {currentUser?.name ?? t("settingsPage.learnerAccount")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentUser?.email ?? t("settingsPage.noEmail")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-background p-5">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-card-foreground">
                {t("settingsPage.appearance")}
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  selectedTheme === "light"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <Sun className="h-4 w-4" />
                {t("settingsPage.light")}
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  selectedTheme === "dark"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <Moon className="h-4 w-4" />
                {t("settingsPage.dark")}
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  selectedTheme === "system"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <SettingsIcon className="h-4 w-4" />
                {t("settingsPage.system")}
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              {t("settingsPage.currentPreference")}{" "}
              <span className="font-medium text-card-foreground">
                {mounted ? (displayedTheme ?? t("settingsPage.system")) : t("settingsPage.loading")}
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
