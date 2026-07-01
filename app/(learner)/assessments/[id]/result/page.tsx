'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

export default function AssessmentResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const score = Number(searchParams.get('score') ?? 0)
  const passing = Number(searchParams.get('passing') ?? 0)
  const passed = score >= passing

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-lg p-8 text-center space-y-6">
        {passed ? (
          <>
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto" />
            <h1 className="text-3xl font-bold text-card-foreground">Congratulations!</h1>
            <p className="text-lg text-muted-foreground">You have passed the assessment</p>
          </>
        ) : (
          <>
            <XCircle className="w-24 h-24 text-red-500 mx-auto" />
            <h1 className="text-3xl font-bold text-card-foreground">Need Improvement</h1>
            <p className="text-lg text-muted-foreground">You did not pass this assessment</p>
          </>
        )}

        <div className="bg-muted rounded-lg p-6">
          <p className="text-5xl font-bold text-primary">{score}%</p>
          <p className="text-muted-foreground mt-2">Your Score</p>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}
