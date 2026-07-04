'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function AssessmentResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()

  const score = Number(searchParams.get('score') ?? 0)
  const passing = Number(searchParams.get('passing') ?? 0)
  const passed = score >= passing

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-lg p-8 text-center space-y-6">
        {passed ? (
          <>
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto" />
            <h1 className="text-3xl font-bold text-card-foreground">
              {t('assessmentsPage.result.passedTitle')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('assessmentsPage.result.passedMessage')}
            </p>
          </>
        ) : (
          <>
            <XCircle className="w-24 h-24 text-red-500 mx-auto" />
            <h1 className="text-3xl font-bold text-card-foreground">
              {t('assessmentsPage.result.failedTitle')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('assessmentsPage.result.failedMessage')}
            </p>
          </>
        )}

        <div className="bg-muted rounded-lg p-6">
          <p className="text-5xl font-bold text-primary">{score}%</p>
          <p className="text-muted-foreground mt-2">
            {t('assessmentsPage.result.yourScore')}
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold"
        >
          {t('assessmentsPage.result.returnToDashboard')}
        </button>
      </div>
    </div>
  )
}
