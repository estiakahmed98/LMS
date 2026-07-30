"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
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
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-red-200 bg-red-50 text-red-700";
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

  async function loadManagement() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/certificates", {
        cache: "no-store",
      });
      const data = await parseApiJson<{
        certificates?: AdminCertificateRow[];
        courses?: CertificateCourseOption[];
        template?: CertificateTemplateValue;
        error?: string;
      }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load certificates.");
      }
      const nextCourses = data.courses ?? [];
      setRows(data.certificates ?? []);
      setCourses(nextCourses);
      setTemplate(data.template ?? DEFAULT_TEMPLATE);
      setCourseId((current) => current || nextCourses[0]?.id || "");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to load certificates.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadManagement();
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
      if (action === "reissue") {
        await loadManagement();
      } else {
        setRows((current) =>
          current.map((row) =>
            row.id === data.certificate?.id ? data.certificate : row,
          ),
        );
      }
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
    if (!courseId) {
      setError("Select a course first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, eligibility }),
      });
      const data = await parseApiJson<{
        issued?: number;
        skippedExisting?: number;
        error?: string;
      }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to issue certificates.");
      }
      setNotice(
        `${data.issued ?? 0} certificate(s) issued; ${
          data.skippedExisting ?? 0
        } existing certificate(s) skipped.`,
      );
      await loadManagement();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to issue certificates.",
      );
    } finally {
      setSaving(false);
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

  return (
    <AdminLayout title={tAdmin("certificates")}>
      <div className="space-y-6 p-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {notice}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h1 className="text-xl font-bold text-card-foreground">
                  {t("management.title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {loading
                    ? "Loading certificates..."
                    : `${rows.length} certificate(s) from the database.`}
                </p>
              </div>
              <Award className="h-6 w-6 text-primary" />
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Loading certificates...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <thead className="border-b border-border bg-muted/70">
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
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                          {row.certificateNumber}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <p className="font-semibold">{row.student}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.studentEmail}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {row.course}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {new Date(row.issueDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
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
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            {canExport ? (
                              <a
                                href={`/admin/certificates/${row.id}`}
                                className="rounded-lg border border-border p-2 hover:bg-muted"
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
                                onClick={() => {
                                  setRevokeTargetId(row.id);
                                  setReason("");
                                }}
                                className="rounded-lg border border-border p-2 hover:bg-muted"
                                aria-label={t("actions.revokeCertificate")}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            ) : null}
                            {canEdit && row.status === "REVOKED" ? (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  void updateCertificate(row.id, "reissue")
                                }
                                className="rounded-lg border border-border p-2 hover:bg-muted disabled:opacity-50"
                                aria-label={t("actions.reissueCertificate")}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            ) : null}
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
                          No certificates have been issued yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-card-foreground">
                {t("bulk.title")}
              </h2>
              <div className="mt-4 space-y-3">
                <select
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <select
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
                    {saving ? "Processing..." : "Issue Eligible Certificates"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-card-foreground">
                {t("revoke.title")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {revokeTarget
                  ? `${revokeTarget.student} · ${revokeTarget.certificateNumber}`
                  : "Select the revoke action from a valid certificate row."}
              </p>
              <textarea
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

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-semibold text-card-foreground">
              {t("template.title")}
            </h2>
            <div className="mt-4 space-y-3">
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
                  disabled={saving}
                  onClick={() => void saveTemplate()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {t("actions.saveTemplate")}
                </button>
              ) : null}
            </div>
          </div>

          <div
            className="rounded-lg border-4 bg-card p-10 text-center"
            style={{ borderColor: template.borderColor }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              {t("preview.completionTitle")}
            </p>
            <p className="mt-8 text-muted-foreground">
              {t("preview.certifiesThat")}
            </p>
            <h3
              className={`mt-3 text-4xl font-bold text-card-foreground ${
                template.fontFamily === "SERIF_FORMAL" ? "font-serif" : ""
              }`}
            >
              {rows[0]?.student ?? "Learner Name"}
            </h3>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              {t("preview.completedCourse")}
            </p>
            <div className="mt-10 flex items-end justify-between text-sm text-muted-foreground">
              {template.directorSignatureUrl ? (
                <img
                  src={template.directorSignatureUrl}
                  alt="Director signature"
                  className="h-12 max-w-32 object-contain"
                />
              ) : (
                <span>{t("preview.directorSignature")}</span>
              )}
              <span className="text-2xl font-bold text-primary">
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
      </div>
    </AdminLayout>
  );
}
