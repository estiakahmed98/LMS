'use client'

import AdminLayout from '@/components/AdminLayout'
import { mockAssessments } from '@/lib/mock-data'
import { useLocale, useTranslations } from 'next-intl'

export default function AdminAssessmentsPage() {
  const tAdmin = useTranslations('admin')
  const tPage = useTranslations('adminAssessmentsPage')
  const tType = useTranslations('assessment')
  const locale = useLocale()
  const localeTag = locale === 'bn' ? 'bn-BD' : 'en-US'
  const numberFormatter = new Intl.NumberFormat(localeTag)

  function getTypeLabel(type: string) {
    switch (type) {
      case 'MCQ':
        return tType('mcq')
      case 'WRITTEN':
        return tType('written')
      case 'PRACTICAL':
        return tType('practical')
      case 'MIXED':
        return tType('mixed')
      default:
        return type
    }
  }

  return (
    <AdminLayout title={tAdmin('assessments')}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">{tAdmin('assessments')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tPage('summary', { count: numberFormatter.format(mockAssessments.length) })}
          </p>
        </div>

        <div className="grid gap-4">
          {mockAssessments.map((assessment) => (
            <div key={assessment.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-bold text-card-foreground mb-2">{assessment.title}</h3>
              <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div>
                  {tPage('type')}: {getTypeLabel(assessment.type)}
                </div>
                <div>
                  {tPage('totalMarks')}: {numberFormatter.format(assessment.totalMarks)}
                </div>
                <div>
                  {tPage('passingMarks')}: {numberFormatter.format(assessment.passingMarks)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
