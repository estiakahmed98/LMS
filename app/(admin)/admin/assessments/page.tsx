'use client'

import AdminLayout from '@/components/AdminLayout'
import {
  mockAssessments,
  mockCourses,
  mockSubmissions,
  type AssessmentType,
} from '@/lib/mock-data'
import { useLocale, useTranslations } from 'next-intl'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Search,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 20

type TypeOption = 'all' | AssessmentType

const typeOptions: TypeOption[] = ['all', 'MCQ', 'WRITTEN', 'PRACTICAL', 'MIXED']

const courseOptions: Array<{ id: string; title: string }> = [
  { id: 'all', title: '' },
  ...mockCourses.map((course) => ({ id: course.id, title: course.title })),
]

export default function AdminAssessmentsPage() {
  const tAdmin = useTranslations('admin')
  const tPage = useTranslations('adminAssessmentsPage')
  const tType = useTranslations('assessment')
  const locale = useLocale()
  const localeTag = locale === 'bn' ? 'bn-BD' : 'en-US'
  const numberFormatter = new Intl.NumberFormat(localeTag)

  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeOption>('all')
  const [course, setCourse] = useState('all')
  const [page, setPage] = useState(1)

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

  const statsByAssessment = useMemo(() => {
    const map = new Map<string, { attempted: number; passed: number }>()
    for (const submission of mockSubmissions) {
      if (submission.obtainedMarks === undefined) continue
      const assessment = mockAssessments.find(
        (item) => item.id === submission.assessmentId,
      )
      if (!assessment) continue
      const entry = map.get(assessment.id) ?? { attempted: 0, passed: 0 }
      entry.attempted += 1
      if (submission.obtainedMarks >= assessment.passingMarks) entry.passed += 1
      map.set(assessment.id, entry)
    }
    return map
  }, [])

  const filteredAssessments = useMemo(
    () =>
      mockAssessments.filter((assessment) => {
        const matchesQuery = assessment.title
          .toLowerCase()
          .includes(query.toLowerCase())
        const matchesType = type === 'all' || assessment.type === type
        const matchesCourse = course === 'all' || assessment.courseId === course
        return matchesQuery && matchesType && matchesCourse
      }),
    [query, type, course],
  )

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAssessments.length / PAGE_SIZE),
  )

  useEffect(() => {
    setPage(1)
  }, [query, type, course])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedAssessments = useMemo(
    () =>
      filteredAssessments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredAssessments, page],
  )

  return (
    <AdminLayout title={tAdmin('assessments')}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">{tAdmin('assessments')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tPage('summary', { count: numberFormatter.format(mockAssessments.length) })}
          </p>
        </div>

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
              {courseOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id === 'all' ? tPage('filters.allCourses') : item.title}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedAssessments.map((assessment) => {
            const stats = statsByAssessment.get(assessment.id) ?? {
              attempted: 0,
              passed: 0,
            }
            const passRate =
              stats.attempted > 0
                ? Math.round((stats.passed / stats.attempted) * 100)
                : 0
            return (
              <Link
                key={assessment.id}
                href={`/admin/assessments/build?assessmentId=${assessment.id}`}
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

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/60 px-2.5 py-2 text-center">
                    <ClipboardList className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-base font-bold text-card-foreground">
                      {numberFormatter.format(assessment.totalMarks)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {tPage('totalMarks')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2.5 py-2 text-center">
                    <Users className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-base font-bold text-card-foreground">
                      {numberFormatter.format(stats.attempted)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {tPage('attempted')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2.5 py-2 text-center">
                    <Trophy className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-base font-bold text-card-foreground">
                      {numberFormatter.format(stats.passed)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {tPage('passed')}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      {tPage('passRate')}
                    </span>
                    <span className="font-semibold text-card-foreground">
                      {passRate}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${passRate}%` }}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
          {paginatedAssessments.length === 0 && (
            <div className="col-span-full rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {tPage('empty')}
            </div>
          )}
        </div>

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
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tPage('pagination.next')}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
