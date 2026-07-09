'use client'

import AdminLayout from '@/components/AdminLayout'
import {
  createAssessment,
  deleteAssessment,
  fetchAssessments,
} from '@/lib/admin-assessment-client'
import type {
  AdminAssessmentSummary,
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
import { useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 20

type TypeOption = 'all' | AssessmentTypeValue

const typeOptions: TypeOption[] = ['all', 'MCQ', 'WRITTEN', 'PRACTICAL', 'MIXED']
const assessmentTypeOptions: AssessmentTypeValue[] = ['MCQ', 'WRITTEN', 'PRACTICAL', 'MIXED']

export default function AdminAssessmentsPage() {
  const tAdmin = useTranslations('admin')
  const tPage = useTranslations('adminAssessmentsPage')
  const tType = useTranslations('assessment')
  const locale = useLocale()
  const localeTag = locale === 'bn' ? 'bn-BD' : 'en-US'
  const numberFormatter = new Intl.NumberFormat(localeTag)

  const [assessments, setAssessments] = useState<AdminAssessmentSummary[]>([])
  const [courses, setCourses] = useState<AdminCourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeOption>('all')
  const [course, setCourse] = useState('all')
  const [page, setPage] = useState(1)

  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
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
      case 'MIXED':
        return tType('mixed')
      default:
        return value
    }
  }

  async function loadAssessments() {
    try {
      setLoading(true)
      const data = await fetchAssessments()
      setAssessments(data)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to load assessments.')
    } finally {
      setLoading(false)
    }
  }

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
    void loadCourses()
  }, [])

  const filteredAssessments = useMemo(
    () =>
      assessments.filter((assessment) => {
        const matchesQuery = assessment.title.toLowerCase().includes(query.toLowerCase())
        const matchesType = type === 'all' || assessment.type === type
        const matchesCourse = course === 'all' || assessment.courseId === course
        return matchesQuery && matchesType && matchesCourse
      }),
    [assessments, query, type, course],
  )

  const totalPages = Math.max(1, Math.ceil(filteredAssessments.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [query, type, course])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedAssessments = useMemo(
    () => filteredAssessments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredAssessments, page],
  )

  function openCreate() {
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
      window.location.href = `/admin/assessments/build?assessmentId=${created.id}`
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to create assessment.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteAssessment(deleteTarget.id)
      setAssessments((current) => current.filter((item) => item.id !== deleteTarget.id))
      setNotice('Assessment deleted.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to delete assessment.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <AdminLayout title={tAdmin('assessments')}>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">{tAdmin('assessments')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tPage('summary', { count: numberFormatter.format(assessments.length) })}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Add Assessment
          </button>
        </div>

        {notice && (
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
            {notice}
          </div>
        )}

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px_220px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tPage('filters.searchPlaceholder')}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as TypeOption)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
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
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">{tPage('filters.allCourses')}</option>
              {courses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center p-16">
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
                  <Link
                    href={`/admin/assessments/build?assessmentId=${assessment.id}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(assessment)}
                    aria-label={`Delete ${assessment.title}`}
                    className="rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {paginatedAssessments.length === 0 && (
              <div className="col-span-full rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                {tPage('empty')}
              </div>
            )}
          </div>
        )}

        {filteredAssessments.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {tPage('pagination.summary', {
                page: numberFormatter.format(page),
                totalPages: numberFormatter.format(totalPages),
                total: numberFormatter.format(filteredAssessments.length),
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

        {isCreating && (
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
                  Title
                  <input
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                    placeholder="e.g. Module 4 Quiz"
                  />
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

        {deleteTarget && (
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
