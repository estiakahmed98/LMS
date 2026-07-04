"use client"

import AdminLayout from "@/components/AdminLayout"
import { scanReviewRows, submissionRows, type SubmissionStatus } from "@/lib/admin-panel-data"
import { useLocale, useTranslations } from "next-intl"
import { Check, Flag, FlaskConical, Maximize2, MessageSquareWarning, PenLine, Search } from "lucide-react"
import { useMemo, useState } from "react"

type Submission = (typeof submissionRows)[number] & { score?: string; note?: string }
type SubmissionType = Submission["type"] | "All"

function statusClass(status: SubmissionStatus) {
  if (status === "Pending") return "border-yellow-200 bg-yellow-50 text-yellow-800"
  if (status === "Reviewed") return "border-green-200 bg-green-50 text-green-700"
  return "border-red-200 bg-red-50 text-red-700"
}

export default function SubmissionsActionPage() {
  const t = useTranslations("adminSubmissionsPage")
  const tAdmin = useTranslations("admin")
  const locale = useLocale()
  const localeTag = locale === "bn" ? "bn-BD" : "en-US"
  const numberFormatter = new Intl.NumberFormat(localeTag)
  const [rows, setRows] = useState<Submission[]>(submissionRows)
  const [type, setType] = useState<SubmissionType>("All")
  const [status, setStatus] = useState<"All" | SubmissionStatus>("Pending")
  const [selectedId, setSelectedId] = useState("SUB-2292")
  const [score, setScore] = useState("")
  const [note, setNote] = useState("")
  const [notice, setNotice] = useState(t("notice.ready"))

  function getTypeLabel(value: SubmissionType) {
    switch (value) {
      case "All":
        return t("filters.all")
      case "Written":
        return t("types.written")
      case "OMR":
        return t("types.omr")
      case "Lab":
        return t("types.lab")
      case "Scan":
        return t("types.scan")
    }
  }

  function getStatusLabel(value: "All" | SubmissionStatus) {
    switch (value) {
      case "All":
        return t("filters.all")
      case "Pending":
        return t("status.pending")
      case "Reviewed":
        return t("status.reviewed")
      case "Disputed":
        return t("status.disputed")
    }
  }

  function getCourseLabel(value: string) {
    switch (value) {
      case "Community Paramedic":
        return t("courses.communityParamedic")
      case "HR & Recruitment":
        return t("courses.hrRecruitment")
      default:
        return value
    }
  }

  function getAssessmentLabel(value: string) {
    switch (value) {
      case "Written - Mod 2":
        return t("assessments.writtenMod2")
      case "MCQ - Mod 4 (Scan)":
        return t("assessments.mcqMod4Scan")
      case "Lab Report - Mod 3":
        return t("assessments.labReportMod3")
      case "Written - Mod 1 (Scan)":
        return t("assessments.writtenMod1Scan")
      case "MCQ - Mod 2":
        return t("assessments.mcqMod2")
      default:
        return value
    }
  }

  const visibleRows = useMemo(
    () => rows.filter((row) => (status === "All" || row.status === status) && (type === "All" || row.type === type)),
    [rows, status, type],
  )
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0]

  function updateSelected(patch: Partial<Submission>, message: string) {
    setRows((current) => current.map((row) => (row.id === selected.id ? { ...row, ...patch } : row)))
    setNotice(message)
  }

  return (
    <AdminLayout title={tAdmin("submissions")}>
      <div className="space-y-6 p-6">
        <section className="grid gap-3 rounded-lg border border-border bg-card p-5 md:grid-cols-5">
          <select value={type} onChange={(event) => setType(event.target.value as SubmissionType)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            {(["All", "Written", "OMR", "Lab", "Scan"] as SubmissionType[]).map((item) => (
              <option key={item} value={item}>
                {getTypeLabel(item)}
              </option>
            ))}
          </select>
          <select className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option>{t("filters.courseAll")}</option>
            <option>{getCourseLabel("Community Paramedic")}</option>
            <option>{getCourseLabel("HR & Recruitment")}</option>
          </select>
          <input className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" type="date" />
          <select value={status} onChange={(event) => setStatus(event.target.value as "All" | SubmissionStatus)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            {(["All", "Pending", "Reviewed", "Disputed"] as Array<"All" | SubmissionStatus>).map((item) => (
              <option key={item} value={item}>
                {getStatusLabel(item)}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              setNotice(
                t("notice.visibleSubmissions", {
                  count: numberFormatter.format(visibleRows.length),
                }),
              )
            }
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            <Search className="h-4 w-4" />
            {t("filters.filter")}
          </button>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-border bg-muted/70">
                <tr>
                  {[
                    t("table.id"),
                    t("table.student"),
                    t("table.assessment"),
                    t("table.type"),
                    t("table.status"),
                    t("table.score"),
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleRows.map((row) => (
                  <tr key={row.id} onClick={() => setSelectedId(row.id)} className={`cursor-pointer hover:bg-muted/40 ${selected.id === row.id ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-4 font-mono text-sm text-muted-foreground">{row.id}</td>
                    <td className="px-4 py-4 text-sm font-semibold">{row.student}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{getAssessmentLabel(row.assessment)}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1">
                        {row.type === "Lab" ? <FlaskConical className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
                        {getTypeLabel(row.type)}
                      </span>
                    </td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>{getStatusLabel(row.status)}</span></td>
                    <td className="px-4 py-4 text-sm">{row.score ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm font-semibold text-primary">{t("reviewPanel.title")}</p>
            <h2 className="text-xl font-bold text-card-foreground">{getTypeLabel(selected.type)} / {getAssessmentLabel(selected.assessment)}</h2>
            <p className="text-sm text-muted-foreground">{selected.student} - {selected.id}</p>

            <div className="mt-5 rounded-lg border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-card-foreground">{t("reviewPanel.scanTitle")}</h3>
                <button onClick={() => setNotice(t("notice.zoomPreview"))} className="rounded-lg border border-border p-2 hover:bg-muted" aria-label={t("reviewPanel.zoomScan")}>
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid h-44 place-items-center rounded-lg border border-dashed border-border bg-card">
                <div className="text-center">
                  <p className="font-mono text-sm font-semibold">OMR-S-{selected.id.replace("SUB-", "")}</p>
                  <p className="text-sm text-muted-foreground">{t("reviewPanel.zoomableThumbnail")}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-border">
              <table className="w-full">
                <thead className="bg-muted/70">
                  <tr>
                    {[t("scanTable.q"), t("scanTable.student"), t("scanTable.correct"), ""].map((heading) => (
                      <th key={heading} className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scanReviewRows.map((row) => (
                    <tr key={row.q}>
                      <td className="px-3 py-2 text-sm font-semibold">{t("scanTable.question", { number: row.q })}</td>
                      <td className="px-3 py-2 text-sm">{row.student}</td>
                      <td className="px-3 py-2 text-sm">{row.correct}</td>
                      <td className={row.matched ? "px-3 py-2 text-green-600" : "px-3 py-2 text-red-600"}>{row.matched ? t("scanTable.ok") : t("scanTable.fix")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3">
              <input value={score} onChange={(event) => setScore(event.target.value)} placeholder={t("reviewPanel.overrideScore")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("reviewPanel.feedbackNotes")} rows={3} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={() => updateSelected({ status: "Reviewed", score, note }, t("notice.approved"))} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <Check className="h-4 w-4" />
                {t("actions.approve")}
              </button>
              <button onClick={() => updateSelected({ status: "Disputed", note }, t("notice.clarificationRequested"))} className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                <MessageSquareWarning className="h-4 w-4" />
                {t("actions.clarify")}
              </button>
              <button onClick={() => updateSelected({ status: "Disputed", note: note || t("reviewPanel.flaggedNote") }, t("notice.flagged"))} className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                <Flag className="h-4 w-4" />
                {t("actions.flag")}
              </button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{notice}</p>
          </aside>
        </section>
      </div>
    </AdminLayout>
  )
}
