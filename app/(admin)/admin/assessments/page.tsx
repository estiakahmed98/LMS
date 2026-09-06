'use client'

import AdminLayout from '@/components/AdminLayout'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsProvider'
import {
  createAssessment,
  deleteAssessment,
  fetchAssessments,
} from '@/lib/admin-assessment-client'
import type {
  AdminAssessmentStats,
  AdminAssessmentSummary,
  AssessmentLifecycleStatus,
  AssessmentTypeValue,
} from '@/lib/admin-assessment-types'
import type { AdminCourseSummary } from '@/lib/admin-course-types'
import { useLocale, useTranslations } from 'next-intl'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouteTransition } from '@/components/providers/RouteTransitionProvider'

const PAGE_SIZE = 20

type TypeOption = 'all' | AssessmentTypeValue
type StatusTab = 'all' | AssessmentLifecycleStatus

const typeOptions: TypeOption[] = ['all', 'MCQ', 'WRITTEN', 'PRACTICAL']
const assessmentTypeOptions: AssessmentTypeValue[] = ['MCQ', 'WRITTEN', 'PRACTICAL']

const statusTabs: StatusTab[] = ['all', 'RUNNING', 'UPCOMING', 'COMPLETED', 'DRAFT']

const EARLIEST_YEAR = 2015

function yearOptions() {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let year = currentYear + 1; year >= EARLIEST_YEAR; year -= 1) {
    years.push(year)
  }
  return years
}

export default function AdminAssessmentsPage() {
  const router = useRouter()
  const { start: startRouteTransition } = useRouteTransition()
  const tAdmin = useTranslations('admin')
  const tPage = useTranslations('adminAssessmentsPage')
  const tType = useTranslations('assessment')
  const { can } = useAdminPermissions()
  const canCreate = can('ASSESSMENTS', 'create')
  const canEdit = can('ASSESSMENTS', 'edit')
  const canDelete = can('ASSESSMENTS', 'delete')
  const locale = useLocale()
  const localeTag = locale === 'bn' ? 'bn-BD' : 'en-US'
  const numberFormatter = new Intl.NumberFormat(localeTag)

  const [assessments, setAssessments] = useState<AdminAssessmentSummary[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<AdminAssessmentStats>({
    all: 0,
    draft: 0,
    upcoming: 0,
    running: 0,
    completed: 0,
  })
  const [courses, setCourses] = useState<AdminCourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeOption>('all')
  const [course, setCourse] = useState('all')
  const [status, setStatus] = useState<StatusTab>('all')
  const [year, setYear] = useState<'all' | string>('all')
  const [page, setPage] = useState(1)

  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [titleError, setTitleError] = useState('')
  const [draft, setDraft] = useState({
    courseId: '',
    title: '',
    type: 'MCQ' as AssessmentTypeValue,
    totalMarks: '100',
    passingMarks: '40',
  })
  const [deleteTarget, setDeleteTarget] = useState<AdminAssessmentSummary | null>(null)

  function getTypeLabel(value: string) {
    switch (value) {
      case 'MCQ':
        return tType('mcq')
      case 'WRITTEN':
        return tType('written')
      case 'PRACTICAL':
        return tType('practical')
      default:
        return value
    }
  }

  function getStatusLabel(value: AssessmentLifecycleStatus) {
    switch (value) {
      case 'DRAFT':
        return 'Draft'
      case 'UPCOMING':
        return 'Upcoming'
      case 'RUNNING':
        return 'Running'
      case 'COMPLETED':
        return 'Completed'
    }
  }

  function getStatusBadgeClass(value: AssessmentLifecycleStatus) {
    switch (value) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700'
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-700'
      case 'RUNNING':
        return 'bg-emerald-100 text-emerald-700'
      case 'COMPLETED':
        return 'bg-amber-100 text-amber-700'
    }
  }

  useEffect(() => {
    const handle = setTimeout(() => setQuery(queryInput.trim()), 350)
    return () => clearTimeout(handle)
  }, [queryInput])

  useEffect(() => {
    setPage(1)
  }, [query, type, course, status, year])

  const isFirstLoad = useRef(true)
  const loadAssessments = useCallback(async () => {
    try {
      setLoading(true)
      const includeStats = isFirstLoad.current
      isFirstLoad.current = false
      const yearRange =
        year !== 'all'
          ? {
              dateFrom: new Date(Date.UTC(Number(year), 0, 1)).toISOString(),
              dateTo: new Date(Date.UTC(Number(year) + 1, 0, 1)).toISOString(),
            }
          : {}
      const data = await fetchAssessments({
        search: query || undefined,
        courseId: course === 'all' ? undefined : course,
        type: type === 'all' ? undefined : type,
        status: status === 'all' ? undefined : status,
        ...yearRange,
        page,
        pageSize: PAGE_SIZE,
        includeStats,
      })
      setAssessments(data.assessments)
      setTotal(data.total)
      if (data.stats) setStats(data.stats)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to load assessments.')
    } finally {
      setLoading(false)
    }
  }, [query, course, type, status, year, page])

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchAssessments({ page: 1, pageSize: 1, includeStats: true })
      if (data.stats) setStats(data.stats)
    } catch {
      // Non-critical — tab counts simply keep their last known values.
    }
  }, [])

  async function loadCourses() {
    try {
      const response = await fetch('/api/admin/courses', { cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json()
      setCourses(data.courses ?? [])
    } catch {
      // convenience list for the dropdown; ignore failures
    }
  }

  useEffect(() => {
    void loadAssessments()
  }, [loadAssessments])

  useEffect(() => {
    void loadCourses()
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedAssessments = assessments

  function openCreate() {
    if (!canCreate) return
    setTitleError('')
    setDraft({
      courseId: courses[0]?.id ?? '',
      title: '',
      type: 'MCQ',
      totalMarks: '100',
      passingMarks: '40',
    })
    setIsCreating(true)
  }

  async function handleCreate() {
    if (!canCreate) return
    if (!draft.title.trim()) {
      setTitleError('Title is required.')
      return
    }
    setTitleError('')
    if (!draft.courseId || !draft.title.trim()) {
      setNotice('Course and title are required.')
      return
    }
    try {
      setSaving(true)
      const created = await createAssessment({
        courseId: draft.courseId,
        title: draft.title.trim(),
        type: draft.type,
        totalMarks: Number(draft.totalMarks) || 0,
        passingMarks: Number(draft.passingMarks) || 0,
      })
      startRouteTransition()
      router.push(`/admin/assessments/build?assessmentId=${created.id}`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to create assessment.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!canDelete) return
    if (!deleteTarget) return
    try {
      await deleteAssessment(deleteTarget.id)
      await Promise.all([loadAssessments(), loadStats()])
      setNotice('Assessment deleted.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to delete assessment.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <AdminLayout title={tAdmin('assessments')}>
      <div className="min-w-0 space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">{tAdmin('assessments')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tPage('summary', { count: numberFormatter.format(total) })}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Assessment
            </button>
          )}
        </div>

        {notice && (
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
            {notice}
          </div>
        )}

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <label className="relative min-w-0 lg:col-span-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder={tPage('filters.searchPlaceholder')}
                className="w-full min-w-0 rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as TypeOption)}
              className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/40 lg:col-span-2"
            >
              {typeOptions.map((item) => (
                <option key={item} value={item}>
                  {item === 'all' ? tPage('filters.allTypes') : getTypeLabel(item)}
                </option>
              ))}
            </select>
            <select
              value={course}
              onChange={(event) => setCourse(event.target.value)}
              className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/40 lg:col-span-3"
            >
              <option value="all">{tPage('filters.allCourses')}</option>
              {courses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/40 lg:col-span-2"
              aria-label="Year"
            >
              <option value="all">All Years</option>
              {yearOptions().map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1.5 shadow-sm">
          {statusTabs.map((item) => {
            const count =
              item === 'all'
                ? stats.all
                : item === 'DRAFT'
                  ? stats.draft
                  : item === 'UPCOMING'
                    ? stats.upcoming
                    : item === 'RUNNING'
                      ? stats.running
                      : stats.completed
            const isActive = status === item
            return (
              <button
                key={item}
                onClick={() => setStatus(item)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-card-foreground'
                }`}
              >
                {item === 'all' ? 'All' : getStatusLabel(item)}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                    isActive ? 'bg-white/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {numberFormatter.format(count)}
                </span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-16">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedAssessments.map((assessment) => (
              <div
                key={assessment.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-primary/0 transition-colors group-hover:bg-primary" />

                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold leading-snug text-card-foreground">
                    {assessment.title}
                  </h3>
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {getTypeLabel(assessment.type)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{assessment.courseTitle}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusBadgeClass(assessment.lifecycleStatus)}`}
                  >
                    {getStatusLabel(assessment.lifecycleStatus)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      assessment.publishedAssignmentCount > 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {assessment.publishedAssignmentCount > 0
                      ? `${assessment.publishedAssignmentCount} published target(s)`
                      : 'Access not published'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/60 px-2.5 py-2 text-center">
                    <ClipboardList className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-base font-bold text-card-foreground">
                      {numberFormatter.format(assessment.totalMarks)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{tPage('totalMarks')}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2.5 py-2 text-center">
                    <Users className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-base font-bold text-card-foreground">
                      {numberFormatter.format(assessment.questionCount)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Questions</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2.5 py-2 text-center">
                    <Trophy className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-base font-bold text-card-foreground">
                      {numberFormatter.format(assessment.passingMarks)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{tPage('passRate')}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                  <Link
                    href={`/admin/assessments/build?assessmentId=${assessment.id}&mode=view`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Link>
                  {canEdit && (
                    <Link
                      href={`/admin/assessments/build?assessmentId=${assessment.id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteTarget(assessment)}
                      aria-label={`Delete ${assessment.title}`}
                      className="rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {paginatedAssessments.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-8 py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ClipboardList className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium text-card-foreground">{tPage('empty')}</p>
                {(query || type !== 'all' || course !== 'all' || year !== 'all' || status !== 'all') && (
                  <button
                    onClick={() => {
                      setQueryInput('')
                      setType('all')
                      setCourse('all')
                      setYear('all')
                      setStatus('all')
                    }}
                    className="mt-1 text-sm font-semibold text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {tPage('pagination.summary', {
                page: numberFormatter.format(page),
                totalPages: numberFormatter.format(totalPages),
                total: numberFormatter.format(total),
              })}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {tPage('pagination.previous')}
              </button>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tPage('pagination.next')}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {canCreate && isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-card-foreground">Add Assessment</h2>
                <button
                  onClick={() => setIsCreating(false)}
                  className="rounded-lg border border-border p-2 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3">
                <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                  Course
                  <select
                    value={draft.courseId}
                    onChange={(event) => setDraft({ ...draft, courseId: event.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                  >
                    <option value="">Select a course…</option>
                    {courses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                  <span>Title <span className="text-destructive">*</span></span>
                  <input
                    value={draft.title}
                    onChange={(event) => {
                      setDraft({ ...draft, title: event.target.value })
                      if (event.target.value.trim()) setTitleError('')
                    }}
                    onBlur={() => setTitleError(draft.title.trim() ? '' : 'Title is required.')}
                    required
                    aria-invalid={Boolean(titleError)}
                    aria-describedby={titleError ? 'assessment-title-error' : undefined}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                    placeholder="e.g. Module 4 Quiz"
                  />
                  {titleError && (
                    <span id="assessment-title-error" role="alert" className="text-xs text-destructive">
                      {titleError}
                    </span>
                  )}
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                  Type
                  <select
                    value={draft.type}
                    onChange={(event) =>
                      setDraft({ ...draft, type: event.target.value as AssessmentTypeValue })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                  >
                    {assessmentTypeOptions.map((item) => (
                      <option key={item} value={item}>
                        {getTypeLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    Total marks
                    <input
                      value={draft.totalMarks}
                      onChange={(event) => setDraft({ ...draft, totalMarks: event.target.value })}
                      type="number"
                      min={0}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-card-foreground">
                    Passing marks
                    <input
                      value={draft.passingMarks}
                      onChange={(event) =>
                        setDraft({ ...draft, passingMarks: event.target.value })
                      }
                      type="number"
                      min={0}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                    />
                  </label>
                </div>
              </div>

              <button
                onClick={() => void handleCreate()}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create &amp; Continue to Builder
              </button>
            </div>
          </div>
        )}

        {canDelete && deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-lg font-bold text-card-foreground">Delete assessment?</h2>
              <p className="text-sm text-muted-foreground">
                This will permanently delete "{deleteTarget.title}" and all its questions.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleDelete()}
                  className="rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
