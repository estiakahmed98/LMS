"use client"

import AdminLayout from "@/components/AdminLayout"
import { gradingRows } from "@/lib/admin-panel-data"
import {
  mockAssessments,
  mockCourses,
  mockEnrollments,
  type AssessmentType,
} from "@/lib/mock-data"
import { useLocale, useTranslations } from "next-intl"
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  KeyRound,
  Search,
  Send,
  Users,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useMemo, useState } from "react"

type GradeRow = (typeof gradingRows)[number]
type GradeValue = "A" | "B" | "C" | "Fail"
type OverrideReason = "appealApproved" | "omrCorrection" | "examinerReview"

type Notice =
  | { key: "ready" | "validationError" | "resultsReleased" }
  | { key: "overrideSaved"; student: string }

type CourseItem = {
  id: string
  name: string
  code: string
  students: number
  assessments: number
  pendingReview: number
  released: number
  passRate: number
}

type AssessmentItem = {
  id: string
  courseId: string
  title: string
  type: AssessmentType
  students: number
  pendingReview: number
  released: boolean
  totalMarks: number
  passingMarks: number
}

const overridePrefix = "Override - "
const gradeValues: GradeValue[] = ["A", "B", "C", "Fail"]
const overrideReasons: OverrideReason[] = [
  "appealApproved",
  "omrCorrection",
  "examinerReview",
]

function gradeFor(score: number): GradeValue {
  if (score >= 85) return "A"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  return "Fail"
}

function getBadgeClass(grade: string) {
  switch (grade) {
    case "A":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "B":
      return "border-blue-200 bg-blue-50 text-blue-700"
    case "C":
      return "border-amber-200 bg-amber-50 text-amber-700"
    default:
      return "border-red-200 bg-red-50 text-red-700"
  }
}

function getAssessmentTypeClass(type: AssessmentType) {
  switch (type) {
    case "MCQ":
      return "bg-blue-50 text-blue-700"
    case "WRITTEN":
      return "bg-purple-50 text-purple-700"
    case "PRACTICAL":
      return "bg-emerald-50 text-emerald-700"
    default:
      return "bg-amber-50 text-amber-700"
  }
}

function buildCourseItems(): CourseItem[] {
  return mockCourses.map((course, index) => {
    const approvedEnrollments = mockEnrollments.filter(
      (item) => item.courseId === course.id && item.status === "APPROVED",
    )

    const courseAssessments = mockAssessments.filter(
      (item) => item.courseId === course.id,
    )

    const released = courseAssessments.filter((_, itemIndex) => itemIndex % 2 === 0)
      .length

    return {
      id: course.id,
      name: course.title,
      code: `COURSE-${index + 1}`,
      students: approvedEnrollments.length,
      assessments: courseAssessments.length,
      pendingReview: courseAssessments.length * 8 + index * 3,
      released,
      passRate: 70 + ((index * 3) % 20),
    }
  })
}

function getAssessmentsByCourse(courseId: string): AssessmentItem[] {
  const courseEnrollments = mockEnrollments.filter(
    (item) => item.courseId === courseId && item.status === "APPROVED",
  )

  return mockAssessments
    .filter((assessment) => assessment.courseId === courseId)
    .map((assessment, index) => ({
      id: assessment.id,
      courseId: assessment.courseId,
      title: assessment.title,
      type: assessment.type,
      students: courseEnrollments.length,
      pendingReview: assessment.type === "MCQ" ? 0 : 12 + index * 3,
      released: index % 2 === 0,
      totalMarks: assessment.totalMarks,
      passingMarks: assessment.passingMarks,
    }))
}

export default function GradingActionPage() {
  const t = useTranslations("adminGradingPage")
  const tAdmin = useTranslations("admin")
  const locale = useLocale()
  const localeTag =
    locale === "bn"
      ? "bn-BD"
      : locale === "ar"
        ? "ar"
        : locale === "ja"
          ? "ja-JP"
          : locale === "ne"
            ? "ne-NP"
            : "en-US"
  const numberFormatter = new Intl.NumberFormat(localeTag)

  const courseItems = useMemo(() => buildCourseItems(), [])

  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null)
  const [selectedAssessment, setSelectedAssessment] =
    useState<AssessmentItem | null>(null)

  const selectedCourseAssessments = useMemo(() => {
    if (!selectedCourse) return []
    return getAssessmentsByCourse(selectedCourse.id)
  }, [selectedCourse])

  const [rows, setRows] = useState<GradeRow[]>(gradingRows)
  const [selectedStudent, setSelectedStudent] = useState("Rakibul Islam")
  const [newScore, setNewScore] = useState("60")
  const [reason, setReason] = useState<OverrideReason>("appealApproved")
  const [note, setNote] = useState("")
  const [notice, setNotice] = useState<Notice>({ key: "ready" })

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [page, setPage] = useState(1)

  const pageSize = 10

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch = row.student
        .toLowerCase()
        .includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === "all" ||
        row.status.toLowerCase().includes(statusFilter.toLowerCase())

      const matchesGrade = gradeFilter === "all" || row.grade === gradeFilter

      return matchesSearch && matchesStatus && matchesGrade
    })
  }, [rows, search, statusFilter, gradeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))

  const paginatedRows = filteredRows.slice(
    (page - 1) * pageSize,
    page * pageSize,
  )

  const selected =
    rows.find((row) => row.student === selectedStudent) ?? rows[0]

  const distribution = useMemo(() => {
    const base = gradeValues.map((grade) => ({ grade, count: 0 }))

    rows.forEach((row) => {
      const bucket = base.find((item) => item.grade === row.grade)
      if (bucket) bucket.count += 1
    })

    return base
  }, [rows])

  const chartData = distribution.map((item) => ({
    ...item,
    grade: getGradeLabel(item.grade),
  }))

  const passedCount = rows.filter((row) => row.grade !== "Fail").length
  const failedCount = rows.filter((row) => row.grade === "Fail").length
  const disputedCount = rows.filter((row) => row.status === "Disputed").length
  const releasedCount = rows.filter((row) => row.status === "Released").length

  function getGradeLabel(grade: string) {
    if (grade === "Fail") return t("grades.fail")
    return grade
  }

  function getCourseName(course: CourseItem) {
    return t(`courses.${course.id}`)
  }

  function getAssessmentTypeLabel(type: AssessmentType) {
    if (type === "PRACTICAL") return t("assessmentTypes.lab")
    if (type === "WRITTEN") return t("assessmentTypes.written")
    if (type === "MCQ") return t("assessmentTypes.mcq")
    return t("assessmentTypes.mixed")
  }

  function getReasonLabel(value: OverrideReason) {
    return t(`reasons.${value}`)
  }

  function getStatusLabel(status: string) {
    if (status.startsWith(overridePrefix)) {
      const reasonKey = status.slice(overridePrefix.length)

      if (overrideReasons.includes(reasonKey as OverrideReason)) {
        return t("status.override", {
          reason: getReasonLabel(reasonKey as OverrideReason),
        })
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

    if (Number.isNaN(score) || score < 0 || score > 100 || !note.trim()) {
      setNotice({ key: "validationError" })
      return
    }

    setRows((current) =>
      current.map((row) =>
        row.student === selected.student
          ? {
              ...row,
              score,
              grade: gradeFor(score),
              status: `${overridePrefix}${reason}`,
            }
          : row,
      ),
    )

    setNotice({ key: "overrideSaved", student: selected.student })
  }

  function resetToCourses() {
    setSelectedCourse(null)
    setSelectedAssessment(null)
    setPage(1)
    setSearch("")
    setGradeFilter("all")
    setStatusFilter("all")
  }

  function resetToAssessments() {
    setSelectedAssessment(null)
    setPage(1)
    setSearch("")
    setGradeFilter("all")
    setStatusFilter("all")
  }

  return (
    <AdminLayout title={tAdmin("grading")}>
      <div className="space-y-6 p-6">
        {!selectedCourse && (
          <>
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h1 className="text-2xl font-bold text-card-foreground">
                {t("courseOverview.title")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("courseOverview.subtitle")}
              </p>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {courseItems.map((course) => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className="rounded-xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-primary">
                        {course.code}
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-card-foreground">
                        {getCourseName(course)}
                      </h2>
                    </div>

                    <div className="rounded-xl bg-primary/10 p-3 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("courseOverview.students")}
                      </p>
                      <h3 className="text-lg font-bold">
                        {numberFormatter.format(course.students)}
                      </h3>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("courseOverview.assessments")}
                      </p>
                      <h3 className="text-lg font-bold">
                        {numberFormatter.format(course.assessments)}
                      </h3>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("courseOverview.pendingReview")}
                      </p>
                      <h3 className="text-lg font-bold text-amber-600">
                        {numberFormatter.format(course.pendingReview)}
                      </h3>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("courseOverview.passRate")}
                      </p>
                      <h3 className="text-lg font-bold text-emerald-600">
                        {numberFormatter.format(course.passRate)}%
                      </h3>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">
                      {t("courseOverview.releasedSummary", {
                        released: numberFormatter.format(course.released),
                        total: numberFormatter.format(course.assessments),
                      })}
                    </p>
                    <span className="text-sm font-semibold text-primary">
                      {t("actions.viewGrading")}
                    </span>
                  </div>
                </button>
              ))}
            </section>
          </>
        )}

        {selectedCourse && !selectedAssessment && (
          <>
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <button
                    onClick={resetToCourses}
                    className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("assessmentOverview.backToCourses")}
                  </button>

                  <h1 className="text-2xl font-bold text-card-foreground">
                    {getCourseName(selectedCourse)}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t("assessmentOverview.summary", {
                      students: numberFormatter.format(selectedCourse.students),
                      assessments: numberFormatter.format(
                        selectedCourse.assessments,
                      ),
                    })}
                  </p>
                </div>

                <button className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold">
                  <Download className="h-4 w-4" />
                  {t("actions.exportCourseReport")}
                </button>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {selectedCourseAssessments.map((assessment) => (
                <button
                  key={assessment.id}
                  onClick={() => setSelectedAssessment(assessment)}
                  className="rounded-xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getAssessmentTypeClass(
                          assessment.type,
                        )}`}
                      >
                        {getAssessmentTypeLabel(assessment.type)}
                      </span>

                      <h2 className="mt-3 text-xl font-bold">
                        {assessment.title}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        assessment.released
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {assessment.released
                        ? t("status.released")
                        : t("status.pending")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("assessmentCard.students")}
                      </p>
                      <h3 className="text-lg font-bold">
                        {numberFormatter.format(assessment.students)}
                      </h3>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("assessmentCard.pending")}
                      </p>
                      <h3 className="text-lg font-bold text-amber-600">
                        {numberFormatter.format(assessment.pendingReview)}
                      </h3>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("assessmentCard.totalMarks")}
                      </p>
                      <h3 className="text-lg font-bold">
                        {numberFormatter.format(assessment.totalMarks)}
                      </h3>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("assessmentCard.passingMarks")}
                      </p>
                      <h3 className="text-lg font-bold">
                        {numberFormatter.format(assessment.passingMarks)}
                      </h3>
                    </div>
                  </div>

                  <p className="mt-5 border-t border-border pt-4 text-sm font-semibold text-primary">
                    {t("actions.openStudentGrading")}
                  </p>
                </button>
              ))}
            </section>
          </>
        )}

        {selectedCourse && selectedAssessment && (
          <>
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <button
                    onClick={resetToAssessments}
                    className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("gradingPanel.backToAssessments")}
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold text-card-foreground">
                      {getCourseName(selectedCourse)} / {selectedAssessment.title}
                    </h1>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${getAssessmentTypeClass(
                        selectedAssessment.type,
                      )}`}
                    >
                      {getAssessmentTypeLabel(selectedAssessment.type)}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {t("gradingPanel.description")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold">
                    <Download className="h-4 w-4" />
                    {t("actions.export")}
                  </button>

                  <button
                    onClick={() => {
                      setRows((current) =>
                        current.map((row) => ({
                          ...row,
                          status: "Released",
                        })),
                      )
                      setNotice({ key: "resultsReleased" })
                    }}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    <Send className="h-4 w-4" />
                    {t("actions.batchReleaseResults")}
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("stats.totalStudents")}
                  </p>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <h2 className="mt-2 text-2xl font-bold">
                  {numberFormatter.format(rows.length)}
                </h2>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("stats.passed")}
                  </p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <h2 className="mt-2 text-2xl font-bold">
                  {numberFormatter.format(passedCount)}
                </h2>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("stats.failed")}
                  </p>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <h2 className="mt-2 text-2xl font-bold">
                  {numberFormatter.format(failedCount)}
                </h2>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("stats.released")}
                  </p>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </div>
                <h2 className="mt-2 text-2xl font-bold">
                  {numberFormatter.format(releasedCount)}
                </h2>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                  <div className="relative min-w-72 flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value)
                        setPage(1)
                      }}
                      placeholder={t("filters.searchStudent")}
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm"
                    />
                  </div>

                  <select
                    value={gradeFilter}
                    onChange={(event) => {
                      setGradeFilter(event.target.value)
                      setPage(1)
                    }}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    <option value="all">{t("filters.allGrades")}</option>
                    <option value="A">{t("filters.gradeA")}</option>
                    <option value="B">{t("filters.gradeB")}</option>
                    <option value="C">{t("filters.gradeC")}</option>
                    <option value="Fail">{t("grades.fail")}</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value)
                      setPage(1)
                    }}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    <option value="all">{t("filters.allStatus")}</option>
                    <option value="Auto-graded">{t("status.autoGraded")}</option>
                    <option value="Manually">{t("status.manuallyReviewed")}</option>
                    <option value="Disputed">{t("status.disputed")}</option>
                    <option value="Released">{t("status.released")}</option>
                  </select>

                  <button className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold">
                    <Filter className="h-4 w-4" />
                    {t("filters.filters")}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px]">
                    <thead className="border-b border-border bg-muted/70">
                      <tr>
                        {[
                          t("table.student"),
                          t("table.score"),
                          t("table.grade"),
                          t("table.status"),
                          t("table.action"),
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
                      {paginatedRows.map((row) => (
                        <tr
                          key={row.student}
                          onClick={() => {
                            setSelectedStudent(row.student)
                            setNewScore(String(row.score))
                          }}
                          className={`cursor-pointer hover:bg-muted/40 ${
                            selected.student === row.student
                              ? "bg-primary/5"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-4 text-sm font-semibold">
                            {row.student}
                          </td>

                          <td className="px-4 py-4 text-sm">
                            {numberFormatter.format(row.score)}%
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${getBadgeClass(
                                row.grade,
                              )}`}
                            >
                              {getGradeLabel(row.grade)}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {getStatusLabel(row.status)}
                          </td>

                          <td className="px-4 py-4">
                            <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                              {t("actions.review")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-border p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("pagination.showing", {
                      visible: numberFormatter.format(paginatedRows.length),
                      total: numberFormatter.format(filteredRows.length),
                    })}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                      className="rounded-lg border border-border p-2 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <span className="text-sm font-semibold">
                      {numberFormatter.format(page)} /{" "}
                      {numberFormatter.format(totalPages)}
                    </span>

                    <button
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                      className="rounded-lg border border-border p-2 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <aside className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {t("override.title")}
                  </p>
                  <h2 className="text-xl font-bold text-card-foreground">
                    {selected.student}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("override.originalScore", {
                      score: numberFormatter.format(selected.score),
                    })}
                  </p>
                </div>

                <input
                  value={newScore}
                  onChange={(event) => setNewScore(event.target.value)}
                  placeholder={t("override.newScore")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />

                <select
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value as OverrideReason)
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {overrideReasons.map((item) => (
                    <option key={item} value={item}>
                      {getReasonLabel(item)}
                    </option>
                  ))}
                </select>

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("override.auditTrailNote")}
                  rows={5}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />

                <button
                  onClick={saveOverride}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <KeyRound className="h-4 w-4" />
                  {t("override.saveOverride")}
                </button>

                <p className="text-sm text-muted-foreground">
                  {getNoticeText(notice)}
                </p>
              </aside>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-card-foreground">
                    {t("distribution.title")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("distribution.subtitle")}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {t("distribution.disputedSummary", {
                    count: numberFormatter.format(disputedCount),
                  })}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="grade" stroke="var(--muted-foreground)" />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(value) => [
                      numberFormatter.format(Number(value)),
                      t("distribution.students"),
                    ]}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="#DC2626" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
