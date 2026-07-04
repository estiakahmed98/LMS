"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getCurrentUser, getInitials } from "@/lib/auth";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  Bell,
  ChevronRight,
  Moon,
  Palette,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  User as UserIcon,
} from "lucide-react";

function formatDate(value: Date | undefined, notAvailable: string) {
  if (!value) return notAvailable;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function PreferenceButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-card-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function SettingsPage() {
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
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-primary/10 via-background to-background px-6 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SettingsIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("settingsPage.eyebrow")}
              </p>
              <h1 className="text-2xl font-bold text-card-foreground sm:text-3xl">
                {t("settingsPage.heading")}
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {t("settingsPage.subtitle")}
          </p>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-background p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                  {currentUser?.name ? (
                    initials
                  ) : (
                    <UserIcon className="h-7 w-7" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-card-foreground">
                      {currentUser?.name ?? t("settingsPage.learnerAccount")}
                    </h2>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                      {t("settingsPage.active")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentUser?.email ?? t("settingsPage.noEmail")}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("settingsPage.fullName")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-card-foreground">
                        {currentUser?.name ?? t("settingsPage.notAvailable")}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("settingsPage.role")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-card-foreground">
                        {currentUser?.role ?? t("settingsPage.learner")}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("settingsPage.joined")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-card-foreground">
                        {formatDate(currentUser?.createdAt, t("settingsPage.notAvailable"))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-card-foreground">
                  {t("settingsPage.accountDetails")}
                </h2>
              </div>

              <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">{t("settingsPage.fullName")}</dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {currentUser?.name ?? t("settingsPage.notAvailable")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">{t("settingsPage.email")}</dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {currentUser?.email ?? t("settingsPage.notAvailable")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">{t("settingsPage.phone")}</dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {currentUser?.phone ?? t("settingsPage.notAdded")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">
                    {t("settingsPage.memberSince")}
                  </dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {formatDate(currentUser?.createdAt, t("settingsPage.notAvailable"))}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-card-foreground">
                  {t("settingsPage.appearance")}
                </h2>
              </div>

              <p className="text-sm text-muted-foreground">
                {t("settingsPage.appearanceHint")}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <PreferenceButton
                  active={selectedTheme === "light"}
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-4 w-4" />
                  {t("settingsPage.light")}
                </PreferenceButton>
                <PreferenceButton
                  active={selectedTheme === "dark"}
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-4 w-4" />
                  {t("settingsPage.dark")}
                </PreferenceButton>
                <PreferenceButton
                  active={selectedTheme === "system"}
                  onClick={() => setTheme("system")}
                >
                  <SettingsIcon className="h-4 w-4" />
                  {t("settingsPage.system")}
                </PreferenceButton>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                {t("settingsPage.currentPreference")}{" "}
                <span className="font-medium text-card-foreground">
                  {mounted
                    ? (displayedTheme ?? t("settingsPage.system"))
                    : t("settingsPage.loading")}
                </span>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-card-foreground">
                  {t("settingsPage.security")}
                </h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">
                      {t("settingsPage.password")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("settingsPage.passwordHint")}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("settingsPage.readOnly")}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">
                      {t("settingsPage.sessionAccess")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("settingsPage.sessionAccessHint")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-card-foreground">
                  {t("settingsPage.notifications")}
                </h2>
              </div>

              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-sm font-medium text-card-foreground">
                  {t("settingsPage.emailReminders")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("settingsPage.emailRemindersHint")}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
        {t("settingsPage.editableTip")}
      </div>
    </div>
  );
}
