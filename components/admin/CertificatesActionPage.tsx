"use client"

import AdminLayout from "@/components/AdminLayout"
import { certificateRows } from "@/lib/admin-panel-data"
import { useTranslations } from "next-intl"
import { Award, Download, RotateCcw, Save, Upload, XCircle } from "lucide-react"
import { useState } from "react"

type Certificate = (typeof certificateRows)[number]
type CertificateStatus = Certificate["status"]
type FontValue = "Serif Formal" | "Sans Modern"
type Notice =
  | { key: "ready" | "bulkIssued" | "revocationReasonRequired" | "signatureUploaded" | "sealUploaded" | "templateSaved" }
  | { key: "downloaded" | "revoked" | "reissued" | "revokedWithReason"; id: string }

function statusClass(status: string) {
  if (status === "Valid") return "border-green-200 bg-green-50 text-green-700"
  return "border-red-200 bg-red-50 text-red-700"
}

export default function CertificatesActionPage() {
  const t = useTranslations("adminCertificatesPage")
  const tAdmin = useTranslations("admin")
  const [rows, setRows] = useState<Certificate[]>(certificateRows)
  const [reason, setReason] = useState("")
  const [institution, setInstitution] = useState("PSTC")
  const [borderColor, setBorderColor] = useState("#DC2626")
  const [font, setFont] = useState<FontValue>("Serif Formal")
  const [notice, setNotice] = useState<Notice>({ key: "ready" })

  function updateCertificate(id: string, patch: Partial<Certificate>, nextNotice: Notice) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    setNotice(nextNotice)
  }

  function getNoticeText(value: Notice) {
    if ("id" in value) {
      return t(`notice.${value.key}`, { id: value.id })
    }

    return t(`notice.${value.key}`)
  }

  function getStatusLabel(status: CertificateStatus) {
    if (status === "Valid") return t("status.valid")
    return t("status.revoked")
  }

  function getCourseLabel(course: string) {
    switch (course) {
      case "Paramedic":
        return t("courses.paramedic")
      case "Public Health":
        return t("courses.publicHealth")
      case "Community Paramedic":
        return t("courses.communityParamedic")
      case "Public Health Essentials":
        return t("courses.publicHealthEssentials")
      default:
        return course
    }
  }

  function getFontLabel(value: FontValue) {
    if (value === "Serif Formal") return t("template.fontSerifFormal")
    return t("template.fontSansModern")
  }

  return (
    <AdminLayout title={tAdmin("certificates")}>
      <div className="space-y-6 p-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h1 className="text-xl font-bold text-card-foreground">{t("management.title")}</h1>
                <p className="text-sm text-muted-foreground">{getNoticeText(notice)}</p>
              </div>
              <Award className="h-6 w-6 text-primary" />
            </div>
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-border bg-muted/70">
                <tr>{[t("table.certId"), t("table.student"), t("table.course"), t("table.status"), t("table.actions")].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-4 font-mono text-sm text-muted-foreground">{row.id}</td>
                    <td className="px-4 py-4 text-sm font-semibold">{row.student}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{getCourseLabel(row.course)}</td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>{getStatusLabel(row.status)}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => setNotice({ key: "downloaded", id: row.id })} className="rounded-lg border border-border p-2 hover:bg-muted" aria-label={t("actions.downloadCertificate")}><Download className="h-4 w-4" /></button>
                        <button onClick={() => updateCertificate(row.id, { status: "Revoked" }, { key: "revoked", id: row.id })} className="rounded-lg border border-border p-2 hover:bg-muted" aria-label={t("actions.revokeCertificate")}><XCircle className="h-4 w-4" /></button>
                        <button onClick={() => updateCertificate(row.id, { status: "Valid" }, { key: "reissued", id: row.id })} className="rounded-lg border border-border p-2 hover:bg-muted" aria-label={t("actions.reissueCertificate")}><RotateCcw className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-card-foreground">{t("bulk.title")}</h2>
              <div className="mt-4 space-y-3">
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                  <option>{t("bulk.courseCommunityParamedic")}</option>
                  <option>{t("bulk.coursePublicHealthEssentials")}</option>
                </select>
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                  <option>{t("bulk.statusPass")}</option>
                  <option>{t("bulk.statusCompleted")}</option>
                </select>
                <button
                  onClick={() => {
                    const nextId = `CERT-${String(91 + rows.length).padStart(4, "0")}`
                    setRows((current) => [{ id: nextId, student: `Bulk Student ${current.length + 1}`, course: "Paramedic", status: "Valid" }, ...current])
                    setNotice({ key: "bulkIssued" })
                  }}
                  className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  {t("bulk.previewIssueAll", { count: 14 })}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-card-foreground">{t("revoke.title")}</h2>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("revoke.reasonPlaceholder")} rows={3} className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <button
                onClick={() => {
                  if (!reason.trim()) {
                    setNotice({ key: "revocationReasonRequired" })
                    return
                  }
                  updateCertificate(rows[0].id, { status: "Revoked" }, { key: "revokedWithReason", id: rows[0].id })
                  setReason("")
                }}
                className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700"
              >
                {t("actions.revokeCertificate")}
              </button>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-semibold text-card-foreground">{t("template.title")}</h2>
            <div className="mt-4 space-y-3">
              <input value={institution} onChange={(event) => setInstitution(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <button onClick={() => setNotice({ key: "signatureUploaded" })} className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                <Upload className="h-4 w-4" />
                {t("template.directorSignatureUpload")}
              </button>
              <button onClick={() => setNotice({ key: "sealUploaded" })} className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                <Upload className="h-4 w-4" />
                {t("template.officialSealUpload")}
              </button>
              <input value={borderColor} onChange={(event) => setBorderColor(event.target.value)} type="color" className="h-10 w-full rounded-lg border border-border bg-background" />
              <select value={font} onChange={(event) => setFont(event.target.value as FontValue)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <option value="Serif Formal">{getFontLabel("Serif Formal")}</option>
                <option value="Sans Modern">{getFontLabel("Sans Modern")}</option>
              </select>
              <button onClick={() => setNotice({ key: "templateSaved" })} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground">
                <Save className="h-4 w-4" />
                {t("actions.saveTemplate")}
              </button>
            </div>
          </div>

          <div className="rounded-lg border-4 bg-card p-10 text-center" style={{ borderColor }}>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">{t("preview.completionTitle")}</p>
            <p className="mt-8 text-muted-foreground">{t("preview.certifiesThat")}</p>
            <h3 className="mt-3 text-4xl font-bold text-card-foreground">Fahim Ahmed</h3>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">{t("preview.completedCourse")}</p>
            <div className="mt-10 flex items-end justify-between text-sm text-muted-foreground">
              <span>{t("preview.directorSignature")}</span>
              <span className="text-2xl font-bold text-primary">{institution}</span>
              <span>{getFontLabel(font)}</span>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
