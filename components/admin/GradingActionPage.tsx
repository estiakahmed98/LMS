"use client"

import AdminLayout from "@/components/AdminLayout"
import { gradingRows } from "@/lib/admin-panel-data"
import { useLocale, useTranslations } from "next-intl"
import { KeyRound, Send } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useMemo, useState } from "react"

type GradeRow = (typeof gradingRows)[number]
type GradeValue = "A" | "B" | "C" | "Fail"
type OverrideReason = "appealApproved" | "omrCorrection" | "examinerReview"
type Notice =
  | { key: "ready" | "validationError" | "resultsReleased" }
  | { key: "overrideSaved"; student: string }

const overridePrefix = "Override - "
const gradeValues: GradeValue[] = ["A", "B", "C", "Fail"]
const overrideReasons: OverrideReason[] = ["appealApproved", "omrCorrection", "examinerReview"]

function gradeFor(score: number): GradeValue {
  if (score >= 85) return "A"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  return "Fail"
}

export default function GradingActionPage() {
  const t = useTranslations("adminGradingPage")
  const tAdmin = useTranslations("admin")
  const locale = useLocale()
  const localeTag = locale === "bn" ? "bn-BD" : "en-US"
  const numberFormatter = new Intl.NumberFormat(localeTag)
  const [rows, setRows] = useState<GradeRow[]>(gradingRows)
  const [selectedStudent, setSelectedStudent] = useState("Rakibul Islam")
  const [newScore, setNewScore] = useState("60")
  const [reason, setReason] = useState<OverrideReason>("appealApproved")
  const [note, setNote] = useState("")
  const [notice, setNotice] = useState<Notice>({ key: "ready" })

  const selected = rows.find((row) => row.student === selectedStudent) ?? rows[0]
  const distribution = useMemo(() => {
    const base = gradeValues.map((grade) => ({ grade, count: 0 }))
    rows.forEach((row) => {
      const bucket = base.find((item) => item.grade === row.grade)
      if (bucket) bucket.count += 1
    })
    return base
  }, [rows])
  const chartData = distribution.map((item) => ({ ...item, grade: getGradeLabel(item.grade) }))

  function getGradeLabel(grade: string) {
    if (grade === "Fail") return t("grades.fail")
    return grade
  }

  function getReasonLabel(value: OverrideReason) {
    return t(`reasons.${value}`)
  }

  function getStatusLabel(status: string) {
    if (status.startsWith(overridePrefix)) {
      const reasonKey = status.slice(overridePrefix.length)
      if (overrideReasons.includes(reasonKey as OverrideReason)) {
        return t("status.override", { reason: getReasonLabel(reasonKey as OverrideReason) })
      }
    }

    switch (status) {
      case "Auto-graded":
        return t("status.autoGraded")
      case "Manually Reviewed":
        return t("status.manuallyReviewed")
      case "Disputed":
        return t("status.disputed")
      case "Released":
        return t("status.released")
      default:
        return status
    }
  }

  function getNoticeText(value: Notice) {
    if (value.key === "overrideSaved") {
      return t("notice.overrideSaved", { student: value.student })
    }

    return t(`notice.${value.key}`)
  }

  function saveOverride() {
    const score = Number(newScore)
    if (Number.isNaN(score) || !note.trim()) {
      setNotice({ key: "validationError" })
      return
    }
    setRows((current) =>
      current.map((row) =>
        row.student === selected.student
          ? { ...row, score, grade: gradeFor(score), status: `${overridePrefix}${reason}` }
          : row,
      ),
    )
    setNotice({ key: "overrideSaved", student: selected.student })
  }

  return (
    <AdminLayout title={tAdmin("grading")}>
      <div className="space-y-6 p-6">
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-5">
          <select className="min-w-64 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option>{t("filters.courseCommunityParamedic")}</option>
            <option>{t("filters.courseHrRecruitment")}</option>
          </select>
          <select className="min-w-64 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <option>{t("filters.assessmentMcqModule4")}</option>
            <option>{t("filters.assessmentWrittenModule2")}</option>
          </select>
          <button
            onClick={() => {
              setRows((current) => current.map((row) => ({ ...row, status: "Released" })))
              setNotice({ key: "resultsReleased" })
            }}
            className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Send className="h-4 w-4" />
            {t("actions.batchReleaseResults")}
          </button>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-border bg-muted/70">
                <tr>{[t("table.student"), t("table.score"), t("table.grade"), t("table.status")].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.student} onClick={() => setSelectedStudent(row.student)} className={`cursor-pointer hover:bg-muted/40 ${selected.student === row.student ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-4 text-sm font-semibold">{row.student}</td>
                    <td className="px-4 py-4 text-sm">{numberFormatter.format(row.score)}%</td>
                    <td className="px-4 py-4"><span className="rounded-lg border border-border px-2.5 py-1 text-sm font-semibold">{getGradeLabel(row.grade)}</span></td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{getStatusLabel(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="space-y-4 rounded-lg border border-border bg-card p-5">
            <div>
              <p className="text-sm font-semibold text-primary">{t("override.title")}</p>
              <h2 className="text-xl font-bold text-card-foreground">{selected.student}</h2>
              <p className="text-sm text-muted-foreground">{t("override.originalScore", { score: numberFormatter.format(selected.score) })}</p>
            </div>
            <input value={newScore} onChange={(event) => setNewScore(event.target.value)} placeholder={t("override.newScore")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            <select value={reason} onChange={(event) => setReason(event.target.value as OverrideReason)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              {overrideReasons.map((item) => (
                <option key={item} value={item}>
                  {getReasonLabel(item)}
                </option>
              ))}
            </select>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("override.auditTrailNote")} rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            <button onClick={saveOverride} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground">
              <KeyRound className="h-4 w-4" />
              {t("override.saveOverride")}
            </button>
            <p className="text-sm text-muted-foreground">{getNoticeText(notice)}</p>
          </aside>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-card-foreground">{t("distribution.title")}</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="grade" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
              <Tooltip
                formatter={(value) => [numberFormatter.format(Number(value)), t("distribution.students")]}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
              />
              <Bar dataKey="count" fill="#DC2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </AdminLayout>
  )
}
