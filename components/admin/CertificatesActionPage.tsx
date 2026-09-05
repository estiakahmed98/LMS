"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import type { CertificateListPayload, CertificateListFilters } from "@/lib/admin-certificate-list";
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
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Award,
  Download,
  LoaderCircle,
  RotateCcw,
  Save,
  Upload,
  XCircle,
} from "lucide-react";

const DEFAULT_TEMPLATE: CertificateTemplateValue = {
  issuerName: "Professional Skills Training Center",
  issuerCode: "PSTC",
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
  const [templateTab, setTemplateTab] = useState<"preview" | "template">("preview");
  const [templateRefresh, setTemplateRefresh] = useState(0);

  const [filters, setFilters] = useState<Omit<CertificateListFilters, "cursor">>({ status: "ALL", q: "", courseId: "", from: "", to: "", pageSize: 25 });
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
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const changeFilters = (values: Partial<typeof filters>) => { setFilters(current => ({ ...current, ...values })); setCursors([""]); setRevokeTargetId(""); };
  const loadManagement = () => { setCursors([""]); setRefresh(value => value + 1); };

  useEffect(() => {
    const timer = setTimeout(() => { setFilters(current => ({ ...current, q: searchInput.trim() })); setCursors([""]); setRevokeTargetId(""); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    if (invalidRange) return () => controller.abort();
    async function load() {
      setLoading(true); setListError(""); setRows([]); setPage(null);
      try {
        const params = new URLSearchParams({ ...filters, pageSize: String(filters.pageSize), cursor: cursors[cursors.length - 1] });
        const response = await fetch(`/api/admin/certificates?${params}`, { cache: "no-store", signal: controller.signal });
        const data = await parseApiJson<CertificateListPayload & { error?: string }>(response);
        if (!response.ok) throw new Error(data.error || "Failed to load certificates.");
        if (!controller.signal.aborted) { setRows(data.certificates); setPage(data); }
      } catch (caught) { if (!controller.signal.aborted) setListError(caught instanceof Error ? caught.message : "Failed to load certificates."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [filters, cursors, refresh, invalidRange]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setOptionsLoading(true);
      try {
        const response = await fetch(`/api/admin/certificates?options=1&q=${encodeURIComponent(courseSearch)}`, { cache: "no-store", signal: controller.signal });
        const data = await parseApiJson<{ courses: CertificateCourseOption[]; hasMore: boolean; error?: string }>(response);
        if (!response.ok) throw new Error(data.error || "Could not load courses.");
        if (!controller.signal.aborted) {
          setCourses(current => [...current.filter(course => (course.id === courseId || course.id === filters.courseId) && !data.courses.some(item => item.id === course.id)), ...data.courses]);
          setCourseOptionsMore(data.hasMore); setOptionsError("");
        }
      } catch (caught) { if (!controller.signal.aborted) setOptionsError(caught instanceof Error ? caught.message : "Could not load courses."); }
      finally { if (!controller.signal.aborted) setOptionsLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [courseSearch, courseId, filters.courseId, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/certificates/template", { cache: "no-store", signal: controller.signal })
      .then(async response => { const data = await parseApiJson<{ template: CertificateTemplateValue; error?: string }>(response); if (!response.ok) throw new Error(data.error || "Could not load template."); return data; })
      .then(data => { if (!controller.signal.aborted) { setTemplate(data.template); setTemplateLoaded(true); } })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load template."); });
    return () => controller.abort();
  }, [templateRefresh]);
  useEffect(() => { stopIssuing.current = false; return () => { stopIssuing.current = true; }; }, []);

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
    if (!courseId || issuing) { if (!courseId) setError("Select a course first."); return; }
    setIssuing(true); setSaving(true); setIssuedCount(0); setError(""); stopIssuing.current = false;
    let total = 0;
    try {
      let hasMore = true;
      let afterUserId: string | null = null;
      while (hasMore && !stopIssuing.current) {
        const response: Response = await fetch("/api/admin/certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, eligibility, afterUserId: afterUserId || undefined }) });
        const data: { issued: number; hasMore: boolean; nextAfterUserId: string | null; error?: string } = await parseApiJson(response);
        if (!response.ok) throw new Error(data.error || "Failed to issue certificates.");
        total += data.issued; setIssuedCount(total); hasMore = data.hasMore; afterUserId = data.nextAfterUserId;
      }
      setNotice(`${total} certificate(s) issued. ${stopIssuing.current && hasMore ? "Paused. Run again to continue; existing certificates are skipped." : "All currently eligible learners processed. Existing certificates were skipped."}`);
    } catch (caught) {
      setError(`${caught instanceof Error ? caught.message : "Issuance failed."} ${total} confirmed issued in this run. You can safely run again; existing certificates are skipped.`);
    } finally { setSaving(false); setIssuing(false); loadManagement(); }
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

  return (
    <AdminLayout title={tAdmin("certificates")}>
      <div className="space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="rounded-2xl bg-primary/10 p-3 text-primary"><Award className="h-6 w-6" /></span><div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Certificate management</h1><p className="mt-1 text-sm text-muted-foreground">Search issued certificates, manage validity, and issue new credentials.</p></div></div>
          <button onClick={loadManagement} disabled={loading || saving} className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium disabled:opacity-50"><RotateCcw className="h-4 w-4" />Refresh</button>
        </header>
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4 text-primary" />Find certificates</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-medium sm:col-span-2">Certificate number, learner name or email<div className="relative mt-1.5"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={searchInput} maxLength={100} onChange={event => setSearchInput(event.target.value)} placeholder="Search certificates..." className="min-h-11 w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm" /></div></label>
            <label className="text-xs font-medium">Issued from<input type="date" value={filters.from} max={filters.to || undefined} onChange={event => changeFilters({ from: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
            <label className="text-xs font-medium">Issued to<input type="date" value={filters.to} min={filters.from || undefined} onChange={event => changeFilters({ to: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
            <label className="text-xs font-medium">Search course options<input value={courseSearch} maxLength={100} onChange={event => setCourseSearch(event.target.value)} placeholder="Type a course name" className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
            <label className="text-xs font-medium">Course<select value={filters.courseId} onChange={event => changeFilters({ courseId: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">All courses, including archived</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            <div className="flex items-end"><button onClick={() => { setSearchInput(""); setCourseSearch(""); changeFilters({ q: "", courseId: "", from: "", to: "", status: "ALL" }); }} className="min-h-11 rounded-lg px-3 text-sm text-primary hover:bg-muted">Reset filters</button></div>
          </div>
          <p className="text-xs text-muted-foreground">Date ranges use Bangladesh time. {optionsLoading ? "Loading course options..." : courseOptionsMore ? "Showing 30 matching courses; refine the course search to find more." : "Course search also updates the issuance course options."}</p>
          {optionsError && <p role="alert" className="text-sm text-destructive">{optionsError} <button onClick={() => setRefresh(value => value + 1)} className="underline">Retry</button></p>}
          {invalidRange && <p role="alert" className="text-sm text-destructive">From date must be on or before To date.</p>}
        </section>
        <div className="flex flex-wrap gap-2" aria-label="Certificate status">
          {(["ALL", "VALID", "REVOKED"] as const).map(status => <button key={status} aria-pressed={filters.status === status} onClick={() => changeFilters({ status })} className={`min-h-11 rounded-xl border px-5 text-sm font-semibold ${filters.status === status ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{status === "ALL" ? "All certificates" : status === "VALID" ? "Valid" : "Revoked"}{page && !loading && <span className="ml-2 tabular-nums">{page.counts[status].toLocaleString()}</span>}</button>)}
        </div>
        {error || listError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error || listError}
          </div>
        ) : null}
        {notice ? (
          <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {notice}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-card-foreground">
                  Certificate history
                </h2>
                <p className="text-sm text-muted-foreground">
                  {loading
                    ? "Loading certificates..."
                    : `${page?.total.toLocaleString() ?? 0} matching certificates ? newest first`}
                </p>
              </div>
              <Award className="h-6 w-6 text-primary" />
            </div>

            {loading || invalidRange ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {invalidRange ? "Correct the date range to load certificates." : "Loading certificates..."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="block w-full md:table md:min-w-[820px]">
                  <thead className="hidden border-b border-border bg-muted/70 md:table-header-group">
                    <tr>
                      {[
                        t("table.certId"),
                        t("table.student"),
                        t("table.course"),
                        "Issued",
                        t("table.status"),
                        t("table.actions"),
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="block space-y-3 p-3 md:table-row-group md:space-y-0 md:divide-y md:divide-border md:p-0">
                    {rows.map((row) => (
                      <tr key={row.id} className="block rounded-xl border border-border py-2 md:table-row md:border-0 md:py-0 hover:bg-muted/20">
                        <td className="block break-words px-4 py-2 md:table-cell md:py-4 font-mono text-xs text-muted-foreground">
                          {row.certificateNumber}
                        </td>
                        <td className="block break-words px-4 py-2 md:table-cell md:py-4 text-sm">
                          <p className="font-semibold">{row.student}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.studentEmail}
                          </p>
                        </td>
                        <td className="block break-words px-4 py-2 md:table-cell md:py-4 text-sm text-muted-foreground">
                          <span className="mr-2 text-xs font-medium md:hidden">Course:</span>{row.course}
                        </td>
                        <td className="block break-words px-4 py-2 md:table-cell md:py-4 text-sm text-muted-foreground">
                          <span className="mr-2 text-xs font-medium md:hidden">Issued:</span>{new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeZone: "Asia/Dhaka" }).format(new Date(row.issueDate))}
                        </td>
                        <td className="block break-words px-4 py-2 md:table-cell md:py-4">
                          <span
                            title={row.revocationReason ?? undefined}
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                              row.status,
                            )}`}
                          >
                            {row.status === "VALID"
                              ? t("status.valid")
                              : t("status.revoked")}
                          </span>
                        </td>
                        <td className="block break-words px-4 py-2 md:table-cell md:py-4">
                          <div className="flex gap-2">
                            {canExport ? (
                              <a
                                href={`/admin/certificates/${row.id}`}
                                className="rounded-lg border border-border p-3 hover:bg-muted"
                                aria-label={t(
                                  "actions.downloadCertificate",
                                )}
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
                                  document.getElementById("certificate-revocation")?.scrollIntoView({ behavior: "smooth", block: "center" });
                                }}
                                className="rounded-lg border border-border p-3 hover:bg-muted"
                                aria-label={t("actions.revokeCertificate")}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            ) : null}
                            {canEdit && row.status === "REVOKED" && !row.reissuedAt ? (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  void updateCertificate(row.id, "reissue")
                                }
                                className="rounded-lg border border-border p-3 hover:bg-muted disabled:opacity-50"
                                aria-label={t("actions.reissueCertificate")}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            ) : null}
                            {row.reissuedAt && <span className="self-center text-xs text-muted-foreground">Reissued</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center text-sm text-muted-foreground"
                        >
                          No certificates match these filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
            <nav aria-label="Certificate pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">Per page<select value={filters.pageSize} onChange={event => changeFilters({ pageSize: Number(event.target.value) })} className="min-h-10 rounded-lg border border-border bg-background px-2">{[25, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label>
              <div className="flex items-center gap-3"><button aria-label="Previous page" disabled={loading || invalidRange || cursors.length === 1} onClick={() => { setCursors(current => current.slice(0, -1)); setRevokeTargetId(""); }} className="rounded-lg border border-border p-3 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs text-muted-foreground">Page {cursors.length}</span><button aria-label="Next page" disabled={loading || invalidRange || !page?.nextCursor} onClick={() => { if (page?.nextCursor) setCursors(current => [...current, page.nextCursor!]); setRevokeTargetId(""); }} className="rounded-lg border border-border p-3 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>
            </nav>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-card-foreground">
                {t("bulk.title")}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Completed: course progress is 100% or completion recorded. Pass: at least one graded assessment meets its passing mark. Existing certificates are skipped.</p>
              {issuing && <button onClick={() => { stopIssuing.current = true; setNotice("Pausing after the current batch finishes..."); }} className="mt-3 min-h-11 w-full rounded-lg border border-border px-3 text-sm">Pause after current batch</button>}
              <div className="mt-4 space-y-3">
                <select
                  aria-label="Course for certificate issuance"
                  disabled={saving}
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Certificate eligibility"
                  disabled={saving}
                  value={eligibility}
                  onChange={(event) =>
                    setEligibility(
                      event.target.value as CertificateEligibility,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <option value="PASS">{t("bulk.statusPass")}</option>
                  <option value="COMPLETED">
                    {t("bulk.statusCompleted")}
                  </option>
                </select>
                {canCreate ? (
                  <button
                    type="button"
                    disabled={saving || !courseId}
                    onClick={() => void issueBulk()}
                    className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {issuing ? `${issuedCount.toLocaleString()} issued...` : saving ? "Processing..." : "Issue Eligible Certificates"}
                  </button>
                ) : null}
              </div>
            </div>

            <div id="certificate-revocation" className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-card-foreground">
                {t("revoke.title")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {revokeTarget
                  ? `${revokeTarget.student} · ${revokeTarget.certificateNumber}`
                  : "Select the revoke action from a valid certificate row."}
              </p>
              <textarea
                aria-label="Revocation reason"
                maxLength={2000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={!revokeTarget}
                placeholder={t("revoke.reasonPlaceholder")}
                rows={3}
                className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-60"
              />
              {canEdit ? (
                <button
                  type="button"
                  disabled={saving || !revokeTarget || !reason.trim()}
                  onClick={() =>
                    revokeTarget &&
                    void updateCertificate(
                      revokeTarget.id,
                      "revoke",
                      reason,
                    )
                  }
                  className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
                >
                  {t("actions.revokeCertificate")}
                </button>
              ) : null}
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-border bg-card">
          <div role="tablist" aria-label="Certificate template views" className="flex gap-2 overflow-x-auto p-3 sm:p-4">
            {(["preview", "template"] as const).map(tab => (
              <button
                key={tab}
                id={`certificate-${tab}-tab`}
                role="tab"
                aria-selected={templateTab === tab}
                aria-controls="certificate-template-panel"
                tabIndex={templateTab === tab ? 0 : -1}
                onClick={() => setTemplateTab(tab)}
                onKeyDown={event => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const next = event.key === "Home" ? "preview" : event.key === "End" ? "template" : tab === "preview" ? "template" : "preview";
                  setTemplateTab(next);
                  document.getElementById(`certificate-${next}-tab`)?.focus();
                }}
                className={`min-h-11 shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${templateTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {tab === "preview" ? "Certificate template & preview" : "Certificate template"}
              </button>
            ))}
          </div>
          {!templateLoaded && <p className="px-5 pb-4 text-sm text-muted-foreground">Template not loaded yet. <button onClick={() => setTemplateRefresh(value => value + 1)} className="text-primary underline">Retry template</button></p>}
        <section id="certificate-template-panel" role="tabpanel" aria-labelledby={`certificate-${templateTab}-tab`} tabIndex={0} className={`grid gap-6 border-t border-border p-4 sm:p-5 ${templateTab === "preview" ? "xl:grid-cols-[360px_minmax(0,1fr)]" : "[&>div]:max-w-2xl"}`}>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold text-card-foreground">
              {t("template.title")}
            </h2>
            <fieldset disabled={!templateLoaded || saving || !canEdit} className="mt-4 space-y-3 disabled:opacity-60">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  Issuer Name
                </span>
                <input
                  value={template.issuerName}
                  onChange={(event) =>
                    setTemplate((current) => ({
                      ...current,
                      issuerName: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  Issuer Code
                </span>
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
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm uppercase"
                  placeholder="PSTC"
                />
                <span className="block text-[11px] text-muted-foreground">
                  New IDs use {template.issuerCode || "CODE"}-YEAR-000001.
                </span>
              </label>
              {canEdit ? (
                <>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    {t("template.directorSignatureUpload")}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) =>
                        void uploadTemplateAsset(
                          event,
                          "directorSignatureUrl",
                        )
                      }
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    {t("template.officialSealUpload")}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) =>
                        void uploadTemplateAsset(event, "officialSealUrl")
                      }
                    />
                  </label>
                </>
              ) : null}
              <input
                value={template.borderColor}
                onChange={(event) =>
                  setTemplate((current) => ({
                    ...current,
                    borderColor: event.target.value,
                  }))
                }
                type="color"
                className="h-10 w-full rounded-lg border border-border bg-background"
              />
              <select
                value={template.fontFamily}
                onChange={(event) =>
                  setTemplate((current) => ({
                    ...current,
                    fontFamily: event.target.value as CertificateFont,
                  }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="SERIF_FORMAL">Serif Formal</option>
                <option value="SANS_MODERN">Sans Modern</option>
              </select>
              {canEdit ? (
                <button
                  type="button"
                  disabled={saving || !templateLoaded}
                  onClick={() => void saveTemplate()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {t("actions.saveTemplate")}
                </button>
              ) : null}
            </fieldset>
          </div>

          <div
            hidden={templateTab !== "preview"}
            className="min-w-0 rounded-2xl border-4 bg-card p-5 text-center sm:p-10"
            style={{ borderColor: template.borderColor }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              {t("preview.completionTitle")}
            </p>
            <p className="mt-8 text-muted-foreground">
              {t("preview.certifiesThat")}
            </p>
            <h3
              className={`mt-3 break-words text-2xl sm:text-4xl font-bold text-card-foreground ${
                template.fontFamily === "SERIF_FORMAL" ? "font-serif" : ""
              }`}
            >
              {rows[0]?.student ?? "Learner Name"}
            </h3>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              {t("preview.completedCourse")}
            </p>
            <div className="mt-10 flex flex-wrap items-end justify-center gap-5 sm:justify-between text-sm text-muted-foreground">
              {template.directorSignatureUrl ? (
                <img
                  src={template.directorSignatureUrl}
                  alt="Director signature"
                  className="h-12 max-w-32 object-contain"
                />
              ) : (
                <span>{t("preview.directorSignature")}</span>
              )}
              <span className="break-words text-lg font-bold text-primary sm:text-2xl">
                {template.issuerName}
              </span>
              {template.officialSealUrl ? (
                <img
                  src={template.officialSealUrl}
                  alt="Official seal"
                  className="h-14 w-14 object-contain"
                />
              ) : (
                <span>
                  {template.fontFamily === "SERIF_FORMAL"
                    ? "Serif Formal"
                    : "Sans Modern"}
                </span>
              )}
            </div>
          </div>
        </section>
        </section>
      </div>
    </AdminLayout>
  );
}
