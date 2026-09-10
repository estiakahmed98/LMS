"use client";

import { adminFetch as fetch } from "@/lib/admin-swr";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { CertificatePreview } from "@/components/shared/CertificatePreview";
import type {
  CertificateListPayload,
  CertificateListFilters,
} from "@/lib/admin-certificate-list";
import { parseApiJson } from "@/lib/parse-api-json";
import type {
  AdminCertificateRow,
  CertificateCourseOption,
  CertificateEligibility,
  CertificateFont,
  CertificateTemplateValue,
} from "@/lib/admin-certificate-types";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Award,
  BadgeCheck,
  Ban,
  Check,
  FileBadge2,
  Download,
  LoaderCircle,
  Palette,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  X,
} from "lucide-react";

const DEFAULT_TEMPLATE: CertificateTemplateValue = {
  issuerName: "Professional Skills Training Center",
  issuerCode: "BOED",
  borderColor: "#DC2626",
  fontFamily: "SERIF_FORMAL",
  directorSignatureUrl: null,
  officialSealUrl: null,
};

function statusClass(status: AdminCertificateRow["status"]) {
  return status === "VALID"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
}

export default function CertificatesActionPage() {
  const t = useTranslations("adminCertificatesPage");
  const tAdmin = useTranslations("admin");
  const { can } = useAdminPermissions();
  const canCreate = can("CERTIFICATES", "create");
  const canEdit = can("CERTIFICATES", "edit");
  const canExport = can("CERTIFICATES", "export");

  const [rows, setRows] = useState<AdminCertificateRow[]>([]);
  const [courses, setCourses] = useState<CertificateCourseOption[]>([]);
  const [template, setTemplate] =
    useState<CertificateTemplateValue>(DEFAULT_TEMPLATE);
  const [courseId, setCourseId] = useState("");
  const [eligibility, setEligibility] =
    useState<CertificateEligibility>("COMPLETED");
  const [revokeTargetId, setRevokeTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [activeView, setActiveView] = useState<"certificates" | "designer">(
    "certificates",
  );
  const [templateTab, setTemplateTab] = useState<"preview" | "template">(
    "preview",
  );
  const [templateRefresh, setTemplateRefresh] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [filters, setFilters] = useState<
    Omit<CertificateListFilters, "cursor">
  >({ status: "ALL", q: "", courseId: "", from: "", to: "", pageSize: 25 });
  const [searchInput, setSearchInput] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [courseOptionsMore, setCourseOptionsMore] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [cursors, setCursors] = useState([""]);
  const [page, setPage] = useState<CertificateListPayload | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [issuing, setIssuing] = useState(false);
  const [issuedCount, setIssuedCount] = useState(0);
  const stopIssuing = useRef(false);
  const invalidRange = Boolean(
    filters.from && filters.to && filters.from > filters.to,
  );
  const changeFilters = (values: Partial<typeof filters>) => {
    setFilters((current) => ({ ...current, ...values }));
    setCursors([""]);
    setRevokeTargetId("");
  };
  const loadManagement = () => {
    setCursors([""]);
    setRefresh((value) => value + 1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => ({ ...current, q: searchInput.trim() }));
      setCursors([""]);
      setRevokeTargetId("");
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    if (invalidRange) return () => controller.abort();
    async function load() {
      setLoading(true);
      setListError("");
      setRows([]);
      setPage(null);
      try {
        const params = new URLSearchParams({
          ...filters,
          pageSize: String(filters.pageSize),
          cursor: cursors[cursors.length - 1],
        });
        const response = await fetch(`/api/admin/certificates?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await parseApiJson<
          CertificateListPayload & { error?: string }
        >(response);
        if (!response.ok)
          throw new Error(data.error || "Failed to load certificates.");
        if (!controller.signal.aborted) {
          setRows(data.certificates);
          setPage(data);
        }
      } catch (caught) {
        if (!controller.signal.aborted)
          setListError(
            caught instanceof Error
              ? caught.message
              : "Failed to load certificates.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [filters, cursors, refresh, invalidRange]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setOptionsLoading(true);
      try {
        const response = await fetch(
          `/api/admin/certificates?options=1&q=${encodeURIComponent(courseSearch)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = await parseApiJson<{
          courses: CertificateCourseOption[];
          hasMore: boolean;
          error?: string;
        }>(response);
        if (!response.ok)
          throw new Error(data.error || "Could not load courses.");
        if (!controller.signal.aborted) {
          setCourses((current) => [
            ...current.filter(
              (course) =>
                (course.id === courseId || course.id === filters.courseId) &&
                !data.courses.some((item) => item.id === course.id),
            ),
            ...data.courses,
          ]);
          setCourseOptionsMore(data.hasMore);
          setOptionsError("");
        }
      } catch (caught) {
        if (!controller.signal.aborted)
          setOptionsError(
            caught instanceof Error
              ? caught.message
              : "Could not load courses.",
          );
      } finally {
        if (!controller.signal.aborted) setOptionsLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [courseSearch, courseId, filters.courseId, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/certificates/template", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await parseApiJson<{
          template: CertificateTemplateValue;
          error?: string;
        }>(response);
        if (!response.ok)
          throw new Error(data.error || "Could not load template.");
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setTemplate(data.template);
          setTemplateLoaded(true);
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load template.",
          );
      });
    return () => controller.abort();
  }, [templateRefresh]);
  useEffect(() => {
    stopIssuing.current = false;
    return () => {
      stopIssuing.current = true;
    };
  }, []);

  async function updateCertificate(
    id: string,
    action: "revoke" | "reissue",
    revocationReason?: string,
  ) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/certificates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: revocationReason }),
      });
      const data = await parseApiJson<{
        certificate?: AdminCertificateRow;
        error?: string;
      }>(response);
      if (!response.ok || !data.certificate) {
        throw new Error(data.error ?? "Failed to update certificate.");
      }
      loadManagement();
      setNotice(
        action === "revoke"
          ? `Certificate ${data.certificate.certificateNumber} revoked.`
          : `Certificate reissued as ${data.certificate.certificateNumber}.`,
      );
      setReason("");
      setRevokeTargetId("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to update certificate.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function issueBulk() {
    if (!courseId || issuing) {
      if (!courseId) setError("Select a course first.");
      return;
    }
    setIssuing(true);
    setSaving(true);
    setIssuedCount(0);
    setError("");
    stopIssuing.current = false;
    let total = 0;
    try {
      let hasMore = true;
      let afterUserId: string | null = null;
      while (hasMore && !stopIssuing.current) {
        const response: Response = await fetch("/api/admin/certificates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            eligibility,
            afterUserId: afterUserId || undefined,
          }),
        });
        const data: {
          issued: number;
          hasMore: boolean;
          nextAfterUserId: string | null;
          error?: string;
        } = await parseApiJson(response);
        if (!response.ok)
          throw new Error(data.error || "Failed to issue certificates.");
        total += data.issued;
        setIssuedCount(total);
        hasMore = data.hasMore;
        afterUserId = data.nextAfterUserId;
      }
      setNotice(
        `${total} certificate(s) issued. ${stopIssuing.current && hasMore ? "Paused. Run again to continue; existing certificates are skipped." : "All currently eligible learners processed. Existing certificates were skipped."}`,
      );
    } catch (caught) {
      setError(
        `${caught instanceof Error ? caught.message : "Issuance failed."} ${total} confirmed issued in this run. You can safely run again; existing certificates are skipped.`,
      );
    } finally {
      setSaving(false);
      setIssuing(false);
      loadManagement();
    }
  }

  async function uploadTemplateAsset(
    event: ChangeEvent<HTMLInputElement>,
    field: "directorSignatureUrl" | "officialSealUrl",
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "certificates");
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });
      const data = await parseApiJson<{ url?: string; error?: string }>(
        response,
      );
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Upload failed.");
      }
      setTemplate((current) => ({ ...current, [field]: data.url ?? null }));
      setNotice("Asset uploaded. Save the template to publish the change.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  }

  async function saveTemplate() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/certificates/template", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      const data = await parseApiJson<{
        template?: CertificateTemplateValue;
        error?: string;
      }>(response);
      if (!response.ok || !data.template) {
        throw new Error(data.error ?? "Failed to save template.");
      }
      setTemplate(data.template);
      setNotice("Certificate template saved.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to save template.",
      );
    } finally {
      setSaving(false);
    }
  }

  const revokeTarget = rows.find((row) => row.id === revokeTargetId);

  const totalCertificates = page?.counts.ALL ?? page?.total ?? 0;
  const validCertificates = page?.counts.VALID ?? 0;
  const revokedCertificates = page?.counts.REVOKED ?? 0;
  const hasActiveFilters = Boolean(
    filters.q ||
    filters.courseId ||
    filters.from ||
    filters.to ||
    filters.status !== "ALL",
  );
  const selectedCourse = courses.find((course) => course.id === courseId);
  const templateAssets: Array<{
    label: string;
    field: "directorSignatureUrl" | "officialSealUrl";
    url: string | null;
  }> = [
    {
      label: "Signature",
      field: "directorSignatureUrl",
      url: template.directorSignatureUrl,
    },
    {
      label: "Official seal",
      field: "officialSealUrl",
      url: template.officialSealUrl,
    },
  ];

  const resetFilters = () => {
    setSearchInput("");
    setCourseSearch("");
    changeFilters({
      q: "",
      courseId: "",
      from: "",
      to: "",
      status: "ALL",
    });
  };

  return (
    <AdminLayout title={tAdmin("certificates")}>
      <main className="min-h-screen bg-muted/20 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-400 space-y-6">
          <div className="flex items-center justify-between gap-4 border-b border-border">
            <div
              role="tablist"
              aria-label="Certificate management views"
              className="flex gap-6"
            >
              {(
                [
                  ["certificates", "Certificate registry", FileBadge2],
                  ["designer", "Template designer", Palette],
                ] as const
              ).map(([view, label, Icon]) => (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  aria-selected={activeView === view}
                  onClick={() => setActiveView(view)}
                  className={
                    "relative flex min-h-12 items-center gap-2 px-1 text-sm font-bold transition " +
                    (activeView === view
                      ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error || listError ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-bold">Something needs your attention</p>
                <p className="mt-0.5">{error || listError}</p>
              </div>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => {
                  setError("");
                  setListError("");
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {notice ? (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
            >
              <Check className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="flex-1">{notice}</p>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {activeView === "certificates" ? (
            <div
              role="tabpanel"
              aria-label="Certificate registry"
              className="space-y-6"
            >
              <section className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                  <label className="relative min-w-0 flex-1">
                    <span className="sr-only">
                      Search certificate number, learner name or email
                    </span>
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchInput}
                      maxLength={100}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search certificate ID, learner or email..."
                      className="min-h-12 w-full rounded-xl border border-border bg-background py-2 pl-10 pr-10 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    />
                    {searchInput ? (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setSearchInput("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </label>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((current) => !current)}
                    aria-expanded={filtersOpen}
                    className={
                      "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition " +
                      (filtersOpen || hasActiveFilters
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-background hover:bg-muted")
                    }
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {hasActiveFilters ? (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    ) : null}
                  </button>
                </div>

                {filtersOpen ? (
                  <div className="border-t border-border bg-muted/25 p-4 sm:p-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                        Course
                        <select
                          value={filters.courseId}
                          onChange={(event) =>
                            changeFilters({ courseId: event.target.value })
                          }
                          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">All courses</option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                        Find a course
                        <input
                          value={courseSearch}
                          maxLength={100}
                          onChange={(event) =>
                            setCourseSearch(event.target.value)
                          }
                          placeholder="Search course options"
                          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                        Issued from
                        <input
                          type="date"
                          value={filters.from}
                          max={filters.to || undefined}
                          onChange={(event) =>
                            changeFilters({ from: event.target.value })
                          }
                          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground"
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                        Issued to
                        <input
                          type="date"
                          value={filters.to}
                          min={filters.from || undefined}
                          onChange={(event) =>
                            changeFilters({ to: event.target.value })
                          }
                          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground"
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Dates use Bangladesh time.
                        {optionsLoading
                          ? " Loading course options..."
                          : courseOptionsMore
                            ? " Showing the first 30 matching courses."
                            : ""}
                      </p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Clear all filters
                        </button>
                      ) : null}
                    </div>
                    {optionsError ? (
                      <p role="alert" className="mt-3 text-sm text-destructive">
                        {optionsError}{" "}
                        <button
                          type="button"
                          onClick={() => setRefresh((value) => value + 1)}
                          className="font-bold underline"
                        >
                          Retry
                        </button>
                      </p>
                    ) : null}
                    {invalidRange ? (
                      <p role="alert" className="mt-3 text-sm text-destructive">
                        From date must be on or before To date.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-black">
                        Certificate registry
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {loading
                          ? "Loading credentials..."
                          : (page?.total.toLocaleString() ?? "0") +
                            " matching records · newest first"}
                      </p>
                    </div>
                    <div className="inline-flex self-start rounded-xl bg-muted p-1">
                      {(["ALL", "VALID", "REVOKED"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => changeFilters({ status })}
                          className={
                            "min-h-9 rounded-lg px-3 text-xs font-bold transition " +
                            (filters.status === status
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground")
                          }
                        >
                          {status === "ALL"
                            ? "All"
                            : status === "VALID"
                              ? "Valid"
                              : "Revoked"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading || invalidRange ? (
                    <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                      {invalidRange ? (
                        <AlertTriangle className="h-7 w-7 text-amber-500" />
                      ) : (
                        <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
                      )}
                      {invalidRange
                        ? "Correct the date range to view certificates."
                        : "Loading certificate registry..."}
                    </div>
                  ) : rows.length ? (
                    <>
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-210">
                          <thead className="border-b border-border bg-muted/35">
                            <tr>
                              {[
                                "Certificate",
                                "Learner",
                                "Course",
                                "Issued",
                                "Status",
                                "",
                              ].map((heading) => (
                                <th
                                  key={heading || "actions"}
                                  className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-wider text-muted-foreground"
                                >
                                  {heading}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {rows.map((row) => (
                              <tr
                                key={row.id}
                                className="group transition hover:bg-muted/30"
                              >
                                <td className="px-5 py-4">
                                  <p className="font-mono text-xs font-bold text-foreground">
                                    {row.certificateNumber}
                                  </p>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                      <UserRound className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="max-w-48 truncate text-sm font-bold">
                                        {row.student}
                                      </p>
                                      <p className="max-w-48 truncate text-xs text-muted-foreground">
                                        {row.studentEmail}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="max-w-56 px-5 py-4">
                                  <p className="truncate text-sm text-muted-foreground">
                                    {row.course}
                                  </p>
                                </td>
                                <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">
                                  {new Intl.DateTimeFormat("en-BD", {
                                    dateStyle: "medium",
                                    timeZone: "Asia/Dhaka",
                                  }).format(new Date(row.issueDate))}
                                </td>
                                <td className="px-5 py-4">
                                  <span
                                    title={row.revocationReason ?? undefined}
                                    className={
                                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold " +
                                      statusClass(row.status)
                                    }
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                    {row.status === "VALID"
                                      ? "Valid"
                                      : "Revoked"}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex justify-end gap-1">
                                    {canExport ? (
                                      <a
                                        href={"/admin/certificates/" + row.id}
                                        title="Download certificate"
                                        aria-label={t(
                                          "actions.downloadCertificate",
                                        )}
                                        className="rounded-lg p-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                      >
                                        <Download className="h-4 w-4" />
                                      </a>
                                    ) : null}
                                    {canEdit && row.status === "VALID" ? (
                                      <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => {
                                          setRevokeTargetId(row.id);
                                          setReason("");
                                        }}
                                        title="Revoke certificate"
                                        aria-label={t(
                                          "actions.revokeCertificate",
                                        )}
                                        className="rounded-lg p-2.5 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/30"
                                      >
                                        <Ban className="h-4 w-4" />
                                      </button>
                                    ) : null}
                                    {canEdit &&
                                    row.status === "REVOKED" &&
                                    !row.reissuedAt ? (
                                      <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() =>
                                          void updateCertificate(
                                            row.id,
                                            "reissue",
                                          )
                                        }
                                        title="Reissue certificate"
                                        aria-label={t(
                                          "actions.reissueCertificate",
                                        )}
                                        className="rounded-lg p-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                                      >
                                        <RotateCcw className="h-4 w-4" />
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="divide-y divide-border md:hidden">
                        {rows.map((row) => (
                          <article key={row.id} className="space-y-4 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <UserRound className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black">
                                    {row.student}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {row.studentEmail}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={
                                  "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold " +
                                  statusClass(row.status)
                                }
                              >
                                {row.status === "VALID" ? "Valid" : "Revoked"}
                              </span>
                            </div>
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="font-mono text-xs font-bold">
                                {row.certificateNumber}
                              </p>
                              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                {row.course}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {new Intl.DateTimeFormat("en-BD", {
                                  dateStyle: "medium",
                                  timeZone: "Asia/Dhaka",
                                }).format(new Date(row.issueDate))}
                              </p>
                              <div className="flex gap-2">
                                {canExport ? (
                                  <a
                                    href={"/admin/certificates/" + row.id}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Download
                                  </a>
                                ) : null}
                                {canEdit && row.status === "VALID" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRevokeTargetId(row.id);
                                      setReason("");
                                    }}
                                    className="min-h-10 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-600"
                                  >
                                    Revoke
                                  </button>
                                ) : null}
                                {canEdit &&
                                row.status === "REVOKED" &&
                                !row.reissuedAt ? (
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() =>
                                      void updateCertificate(row.id, "reissue")
                                    }
                                    className="min-h-10 rounded-lg border border-border px-3 text-xs font-bold"
                                  >
                                    Reissue
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <Search className="h-6 w-6" />
                      </span>
                      <h3 className="mt-4 font-black">No certificates found</h3>
                      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        Try a different learner, certificate ID, course, or date
                        range.
                      </p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-4 text-sm font-bold text-primary hover:underline"
                        >
                          Clear filters
                        </button>
                      ) : null}
                    </div>
                  )}

                  <nav
                    aria-label="Certificate pagination"
                    className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-4"
                  >
                    <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      Rows per page
                      <select
                        value={filters.pageSize}
                        onChange={(event) =>
                          changeFilters({
                            pageSize: Number(event.target.value),
                          })
                        }
                        className="min-h-9 rounded-lg border border-border bg-background px-2 text-foreground"
                      >
                        {[25, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={
                          loading || invalidRange || cursors.length === 1
                        }
                        onClick={() => {
                          setCursors((current) => current.slice(0, -1));
                          setRevokeTargetId("");
                        }}
                        className="rounded-lg border border-border p-2.5 transition hover:bg-muted disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="min-w-16 text-center text-xs font-bold text-muted-foreground">
                        Page {cursors.length}
                      </span>
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={loading || invalidRange || !page?.nextCursor}
                        onClick={() => {
                          if (page?.nextCursor)
                            setCursors((current) => [
                              ...current,
                              page.nextCursor!,
                            ]);
                          setRevokeTargetId("");
                        }}
                        className="rounded-lg border border-border p-2.5 transition hover:bg-muted disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </nav>
                </div>

                <aside
                  id="issue-certificates"
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm xl:sticky xl:top-6"
                >
                  <div className="bg-linear-to-br from-primary/15 via-primary/5 to-transparent p-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <h2 className="mt-4 text-lg font-black">
                      Issue certificates
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      Create credentials in bulk for everyone who meets your
                      selected rule.
                    </p>
                  </div>
                  <div className="space-y-4 border-t border-border p-5">
                    <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                      1. Choose course
                      <select
                        aria-label="Course for certificate issuance"
                        disabled={saving}
                        value={courseId}
                        onChange={(event) => setCourseId(event.target.value)}
                        className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select a course</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <fieldset className="space-y-2">
                      <legend className="mb-1.5 text-xs font-bold text-muted-foreground">
                        2. Eligibility rule
                      </legend>
                      {[
                        {
                          value: "COMPLETED" as const,
                          title: "Course completed",
                          text: "100% progress or completion recorded",
                        },
                        {
                          value: "PASS" as const,
                          title: "Assessment passed",
                          text: "At least one graded assessment passed",
                        },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className={
                            "flex cursor-pointer gap-3 rounded-xl border p-3 transition " +
                            (eligibility === option.value
                              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:bg-muted/40")
                          }
                        >
                          <input
                            type="radio"
                            name="certificate-eligibility"
                            value={option.value}
                            checked={eligibility === option.value}
                            disabled={saving}
                            onChange={() => setEligibility(option.value)}
                            className="mt-1 accent-primary"
                          />
                          <span>
                            <span className="block text-sm font-bold text-foreground">
                              {option.title}
                            </span>
                            <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                              {option.text}
                            </span>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    <div className="rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
                      <p className="flex gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        Existing certificates are safely skipped. You can run
                        this action again without creating duplicates.
                      </p>
                    </div>
                    {canCreate ? (
                      <button
                        type="button"
                        disabled={saving || !courseId}
                        onClick={() => void issueBulk()}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/15 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {issuing ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            {issuedCount.toLocaleString()} issued
                          </>
                        ) : (
                          <>
                            <Award className="h-4 w-4" />
                            Issue eligible learners
                          </>
                        )}
                      </button>
                    ) : null}
                    {issuing ? (
                      <button
                        type="button"
                        onClick={() => {
                          stopIssuing.current = true;
                          setNotice(
                            "Pausing after the current batch finishes...",
                          );
                        }}
                        className="min-h-10 w-full rounded-xl border border-border text-xs font-bold hover:bg-muted"
                      >
                        Pause after current batch
                      </button>
                    ) : null}
                    {selectedCourse ? (
                      <p className="text-center text-[11px] text-muted-foreground">
                        Ready for {selectedCourse.title}
                      </p>
                    ) : null}
                  </div>
                </aside>
              </section>
            </div>
          ) : null}

          {activeView === "designer" ? (
            <section
              role="tabpanel"
              aria-label="Template designer"
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                    <Palette className="h-4 w-4" />
                    Brand settings
                  </div>
                  <h2 className="mt-2 text-xl font-black">
                    Certificate template
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Customize the identity applied to every new certificate.
                  </p>
                </div>
                <div className="flex rounded-xl bg-muted p-1 xl:hidden">
                  {(["preview", "template"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTemplateTab(tab)}
                      className={
                        "min-h-9 rounded-lg px-3 text-xs font-bold capitalize " +
                        (templateTab === tab
                          ? "bg-card shadow-sm"
                          : "text-muted-foreground")
                      }
                    >
                      {tab === "template" ? "Settings" : "Preview"}
                    </button>
                  ))}
                </div>
              </div>

              {!templateLoaded ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
                  Loading template...
                  <button
                    type="button"
                    onClick={() => setTemplateRefresh((value) => value + 1)}
                    className="font-bold text-primary hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="grid xl:grid-cols-[360px_minmax(0,1fr)]">
                  <div
                    className={
                      "border-border p-5 xl:block xl:border-r " +
                      (templateTab === "template" ? "block" : "hidden")
                    }
                  >
                    <fieldset
                      disabled={saving || !canEdit}
                      className="space-y-5 disabled:opacity-60"
                    >
                      <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                        Issuer name
                        <input
                          value={template.issuerName}
                          onChange={(event) =>
                            setTemplate((current) => ({
                              ...current,
                              issuerName: event.target.value,
                            }))
                          }
                          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                        Issuer code
                        <input
                          value={template.issuerCode}
                          maxLength={12}
                          onChange={(event) =>
                            setTemplate((current) => ({
                              ...current,
                              issuerCode: event.target.value
                                .toUpperCase()
                                .replace(/[^A-Z0-9]/g, ""),
                            }))
                          }
                          className="min-h-11 rounded-xl border border-border bg-background px-3 font-mono text-sm font-normal uppercase text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="BOED"
                        />
                        <span className="font-normal">
                          New IDs use {template.issuerCode || "CODE"}
                          -YEAR-000001
                        </span>
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                        Typeface
                        <select
                          value={template.fontFamily}
                          onChange={(event) =>
                            setTemplate((current) => ({
                              ...current,
                              fontFamily: event.target.value as CertificateFont,
                            }))
                          }
                          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground"
                        >
                          <option value="SERIF_FORMAL">Serif Formal</option>
                          <option value="SANS_MODERN">Sans Modern</option>
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                        Accent color
                        <span className="flex items-center gap-3 rounded-xl border border-border bg-background p-2">
                          <input
                            value={template.borderColor}
                            onChange={(event) =>
                              setTemplate((current) => ({
                                ...current,
                                borderColor: event.target.value,
                              }))
                            }
                            type="color"
                            className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                          />
                          <span className="font-mono text-sm font-normal uppercase text-foreground">
                            {template.borderColor}
                          </span>
                        </span>
                      </label>
                      {canEdit ? (
                        <div className="grid grid-cols-2 gap-3">
                          {templateAssets.map(({ label, field, url }) => (
                            <label
                              key={field}
                              className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-center text-xs font-bold transition hover:border-primary/50 hover:bg-primary/5"
                            >
                              {url ? (
                                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <Upload className="h-5 w-5 text-muted-foreground" />
                              )}
                              {url
                                ? label + " added"
                                : "Upload " + label.toLowerCase()}
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(event) =>
                                  void uploadTemplateAsset(event, field)
                                }
                              />
                            </label>
                          ))}
                        </div>
                      ) : null}
                      {canEdit ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void saveTemplate()}
                          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50"
                        >
                          {saving ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save & publish
                        </button>
                      ) : null}
                    </fieldset>
                  </div>
                  <div
                    className={
                      "min-w-0 bg-muted/25 p-4 sm:p-6 xl:block " +
                      (templateTab === "preview" ? "block" : "hidden")
                    }
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black">Live preview</p>
                        <p className="text-xs text-muted-foreground">
                          Updates as you edit
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Preview
                      </span>
                    </div>
                    <CertificatePreview
                      student={rows[0]?.student ?? "Learner Name"}
                      course={rows[0]?.course ?? "Course Name"}
                      issuer={template.issuerName}
                      fontFamily={template.fontFamily}
                      directorSignatureUrl={template.directorSignatureUrl}
                      officialSealUrl={template.officialSealUrl}
                      accentColor={template.borderColor}
                      showWatermark
                    />
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </div>

        {revokeTarget ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-certificate-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) {
                setRevokeTargetId("");
                setReason("");
              }
            }}
          >
            <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
              <div className="flex items-start gap-4 p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    id="revoke-certificate-title"
                    className="text-xl font-black"
                  >
                    Revoke this certificate?
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    It will no longer be considered valid. This action is
                    recorded and the credential may be reissued later.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  disabled={saving}
                  onClick={() => {
                    setRevokeTargetId("");
                    setReason("");
                  }}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="border-y border-border bg-muted/30 px-6 py-4">
                <p className="text-sm font-black">{revokeTarget.student}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {revokeTarget.certificateNumber} · {revokeTarget.course}
                </p>
              </div>
              <div className="p-6">
                <label className="grid gap-2 text-sm font-bold">
                  Reason for revocation
                  <textarea
                    autoFocus
                    maxLength={2000}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Explain why this certificate is being revoked..."
                    rows={4}
                    className="resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
                  />
                </label>
                <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
                  {reason.length}/2000
                </p>
                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setRevokeTargetId("");
                      setReason("");
                    }}
                    className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold hover:bg-muted disabled:opacity-50"
                  >
                    Keep certificate
                  </button>
                  <button
                    type="button"
                    disabled={saving || !reason.trim()}
                    onClick={() =>
                      void updateCertificate(
                        revokeTarget.id,
                        "revoke",
                        reason.trim(),
                      )
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Ban className="h-4 w-4" />
                    )}
                    Revoke certificate
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </AdminLayout>
  );
}
