"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  Bell,
  Check,
  ChevronRight,
  LoaderCircle,
  Moon,
  Palette,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  User as UserIcon,
} from "lucide-react";
import {
  COLOR_THEME_META,
  DEFAULT_COLOR_THEME,
  getStoredColorTheme,
  setStoredColorTheme,
  subscribeColorThemeChanges,
  SUPPORTED_COLOR_THEMES,
  type ColorTheme,
} from "@/lib/color-theme";
import { useCurrentUser } from "@/lib/use-current-user";
import { parseApiJson } from "@/lib/parse-api-json";
import { getInitials } from "@/lib/auth";
import type { LearnerProfilePayload } from "@/lib/learner-profile-types";
import { usePortalPermissions } from "@/components/portal/PortalPermissionsProvider";

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
  disabled = false,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
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
  const { can } = usePortalPermissions();
  const canEditSettings = can("SETTINGS", "edit");
  const currentUser = useCurrentUser("/settings", { allowPathFallback: false });
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(DEFAULT_COLOR_THEME);
  const [profile, setProfile] = useState<LearnerProfilePayload | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setColorTheme(getStoredColorTheme());

    return subscribeColorThemeChanges((nextTheme) => {
      setColorTheme(nextTheme);
    });
  }, []);

  useEffect(() => {
    void (async () => {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const res = await fetch("/api/learner/profile");
        const data = await parseApiJson<{ profile?: LearnerProfilePayload; error?: string }>(res);
        if (!res.ok || !data.profile) {
          throw new Error(data.error ?? "Failed to load learner profile.");
        }
        setProfile(data.profile);
      } catch (error) {
        setProfileError(error instanceof Error ? error.message : "Failed to load learner profile.");
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const displayUser = profile ?? currentUser;
  const initials = useMemo(
    () => getInitials(displayUser?.name ?? t("settingsPage.learner")),
    [displayUser?.name, t],
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
        <div className="border-b border-border bg-linear-to-r from-primary/10 via-background to-background px-6 py-6 sm:px-8">
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
                  {displayUser?.name ? (
                    initials
                  ) : (
                    <UserIcon className="h-7 w-7" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-card-foreground">
                      {displayUser?.name ?? t("settingsPage.learnerAccount")}
                    </h2>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                      {t("settingsPage.active")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {displayUser?.email ?? t("settingsPage.noEmail")}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("settingsPage.fullName")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-card-foreground">
                        {displayUser?.name ?? t("settingsPage.notAvailable")}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("settingsPage.role")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-card-foreground">
                        {displayUser?.role ?? t("settingsPage.learner")}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("settingsPage.joined")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-card-foreground">
                        {formatDate(
                          displayUser?.createdAt ? new Date(displayUser.createdAt) : undefined,
                          t("settingsPage.notAvailable"),
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                {loadingProfile ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading profile from database...
                  </span>
                ) : profileError ? (
                  profileError
                ) : profile ? (
                  `${profile.lastActive ? `Last active ${new Date(profile.lastActive).toLocaleString()}` : ""}`
                ) : (
                  "No database profile found."
                )}
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
                  <dt className="text-sm text-muted-foreground">
                    {t("settingsPage.fullName")}
                  </dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {displayUser?.name ?? t("settingsPage.notAvailable")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">
                    {t("settingsPage.email")}
                  </dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {displayUser?.email ?? t("settingsPage.notAvailable")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">
                    {t("settingsPage.phone")}
                  </dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {displayUser?.phone ?? t("settingsPage.notAdded")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">
                    {t("settingsPage.memberSince")}
                  </dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {formatDate(
                      displayUser?.createdAt ? new Date(displayUser.createdAt) : undefined,
                      t("settingsPage.notAvailable"),
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-card-foreground">
                  Profile details
                </h2>
              </div>

              <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">Date of birth</dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {profile?.profile?.dateOfBirth
                      ? formatDate(new Date(profile.profile.dateOfBirth), t("settingsPage.notAvailable"))
                      : t("settingsPage.notAvailable")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">NID number</dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {profile?.profile?.nidNumber ?? t("settingsPage.notAdded")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">Address</dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {[profile?.profile?.address, profile?.profile?.city, profile?.profile?.postalCode]
                      .filter(Boolean)
                      .join(", ") || t("settingsPage.notAdded")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">Enrollments</dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {profile ? String(profile.enrollmentCount) : t("settingsPage.notAvailable")}
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
                  disabled={!canEditSettings}
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-4 w-4" />
                  {t("settingsPage.light")}
                </PreferenceButton>
                <PreferenceButton
                  active={selectedTheme === "dark"}
                  disabled={!canEditSettings}
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-4 w-4" />
                  {t("settingsPage.dark")}
                </PreferenceButton>
                <PreferenceButton
                  active={selectedTheme === "system"}
                  disabled={!canEditSettings}
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

              <div className="mt-6 border-t border-border pt-4">
                <p className="text-sm font-medium text-card-foreground">
                  {t("settingsPage.colorTheme")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("settingsPage.colorThemeHint")}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {SUPPORTED_COLOR_THEMES.map((item) => {
                    const meta = COLOR_THEME_META[item];
                    const active = mounted && colorTheme === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        disabled={!canEditSettings}
                        onClick={() => setStoredColorTheme(item)}
                        className={`flex flex-col items-center gap-2 rounded-lg border px-3 py-3 text-xs font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-card-foreground"
                        }`}
                      >
                        <span className="relative flex h-6 w-10 items-center justify-center">
                          <span
                            className="absolute left-0 h-6 w-6 rounded-full border border-border/60"
                            style={{ background: meta.primary }}
                          />
                          <span
                            className="absolute right-0 h-6 w-6 rounded-full border border-border/60"
                            style={{ background: meta.secondary }}
                          />
                          {active && (
                            <Check className="absolute -top-1.5 right-0 h-3.5 w-3.5 rounded-full bg-primary p-0.5 text-primary-foreground" />
                          )}
                        </span>
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
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
    </div>
  );
}
