"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  Camera,
  LoaderCircle,
  Moon,
  Palette,
  Save,
  Settings as SettingsIcon,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { getInitials, patchMirroredSessionUser } from "@/lib/auth";
import { useCurrentUser } from "@/lib/use-current-user";
import { parseApiJson } from "@/lib/parse-api-json";
import type {
  InstructorProfilePayload,
  InstructorProfileUpdateInput,
} from "@/lib/instructor-class-types";
import { usePortalPermissions } from "@/components/portal/PortalPermissionsProvider";

export default function InstructorSettingsPage() {
  const t = useTranslations();
  const { can } = usePortalPermissions();
  const canEditSettings = can("SETTINGS", "edit");
  const currentUser = useCurrentUser("/instructor/settings", { allowPathFallback: false });
  const { theme, setTheme, resolvedTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<InstructorProfilePayload | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoadingProfile(true);
      try {
        const res = await fetch("/api/instructor/profile");
        const data = await parseApiJson<{ profile?: InstructorProfilePayload }>(res);
        if (!res.ok || !data.profile) {
          throw new Error(
            "error" in data && data.error ? String(data.error) : "Failed to load profile",
          );
        }
        setProfile(data.profile);
        setName(data.profile.name);
        setPhone(data.profile.phone ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const displayName = profile?.name ?? currentUser?.name ?? "";
  const displayPhoto = profile?.photoUrl ?? currentUser?.photoUrl ?? null;
  const initials = useMemo(
    () => getInitials(displayName || t("settingsPage.learner")),
    [displayName, t],
  );

  const selectedTheme = mounted ? theme : undefined;
  const displayedTheme = mounted
    ? theme === "system"
      ? "system"
      : (resolvedTheme ?? theme)
    : undefined;

  const passwordMismatch =
    newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword;

  function applyProfileUpdate(next: InstructorProfilePayload) {
    setProfile(next);
    setName(next.name);
    setPhone(next.phone ?? "");
    patchMirroredSessionUser({
      name: next.name,
      email: next.email,
      photoUrl: next.photoUrl,
    });
  }

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/instructor/profile/photo", {
        method: "POST",
        body: formData,
      });
      const data = await parseApiJson<{ profile?: InstructorProfilePayload; error?: string }>(res);
      if (!res.ok || !data.profile) {
        throw new Error(data.error ?? "Failed to upload photo");
      }
      applyProfileUpdate(data.profile);
      setSuccess(t("instructorSettingsPage.photoSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (passwordMismatch) {
      setError(t("instructorSettingsPage.passwordMismatch"));
      setSaving(false);
      return;
    }

    try {
      const body: InstructorProfileUpdateInput = {};
      if (name.trim() && name.trim() !== profile?.name) {
        body.name = name.trim();
      }
      if (phone !== (profile?.phone ?? "")) {
        body.phone = phone.trim();
      }
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      if (!body.name && body.phone === undefined && !body.newPassword) {
        setSuccess(t("instructorSettingsPage.noChanges"));
        setSaving(false);
        return;
      }

      const res = await fetch("/api/instructor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await parseApiJson<{ profile?: InstructorProfilePayload; error?: string }>(res);
      if (!res.ok || !data.profile) {
        throw new Error(data.error ?? "Failed to update profile");
      }

      applyProfileUpdate(data.profile);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(t("instructorSettingsPage.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

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
          <section className="rounded-xl border border-border bg-background p-5 space-y-5">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-xl font-bold text-primary">
                  {displayPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={displayPhoto} alt={displayName} className="h-full w-full object-cover" />
                  ) : displayName ? (
                    initials
                  ) : (
                    <UserIcon className="h-8 w-8" />
                  )}
                </div>
                {canEditSettings && <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted disabled:opacity-50"
                  aria-label={t("instructorSettingsPage.changePhoto")}
                >
                  {uploadingPhoto ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handlePhotoUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <h2 className="text-lg font-bold text-card-foreground">
                  {displayName || t("settingsPage.learnerAccount")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile?.email ?? currentUser?.email ?? t("settingsPage.noEmail")}
                </p>
                {profile?.createdAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("settingsPage.memberSince")}{" "}
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {loadingProfile ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {t("instructorSettingsPage.loading")}
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-sm space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("settingsPage.fullName")}
                  </span>
                  <input
                    value={name}
                    disabled={!canEditSettings}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="block text-sm space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("settingsPage.email")}
                  </span>
                  <input
                    value={profile?.email ?? ""}
                    readOnly
                    className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("instructorSettingsPage.emailReadOnly")}
                  </p>
                </label>

                <label className="block text-sm space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("settingsPage.phone")}
                  </span>
                  <input
                    value={phone}
                    disabled={!canEditSettings}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("settingsPage.notAdded")}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                  />
                </label>

                <div className="rounded-lg border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-card-foreground">
                    {t("instructorSettingsPage.changePassword")}
                  </h3>
                  <label className="block text-sm space-y-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      {t("instructorSettingsPage.currentPassword")}
                    </span>
                    <input
                      type="password"
                      disabled={!canEditSettings}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                    />
                  </label>
                  <label className="block text-sm space-y-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      {t("instructorSettingsPage.newPassword")}
                    </span>
                    <input
                      type="password"
                      disabled={!canEditSettings}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                    />
                  </label>
                  <label className="block text-sm space-y-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      {t("instructorSettingsPage.confirmPassword")}
                    </span>
                    <input
                      type="password"
                      disabled={!canEditSettings}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                    />
                  </label>
                  {passwordMismatch && (
                    <p className="text-sm text-red-600">{t("instructorSettingsPage.passwordMismatch")}</p>
                  )}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}

                {canEditSettings && <button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={saving || passwordMismatch || uploadingPhoto}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t("instructorSettingsPage.save")}
                </button>}
              </div>
            )}
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
                disabled={!canEditSettings}
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
                disabled={!canEditSettings}
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
                disabled={!canEditSettings}
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
