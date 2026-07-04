'use client'

import { useTranslations } from 'next-intl'

export type QuestionStatus = 'ANSWERED' | 'IN_PROGRESS' | 'NOT_STARTED'

const styles: Record<QuestionStatus, string> = {
  ANSWERED: 'bg-green-500/10 text-green-600',
  IN_PROGRESS: 'bg-primary/10 text-primary',
  NOT_STARTED: 'bg-muted text-muted-foreground',
}

const labelKeys: Record<QuestionStatus, string> = {
  ANSWERED: 'assessmentTaking.status.answered',
  IN_PROGRESS: 'assessmentTaking.status.inProgress',
  NOT_STARTED: 'assessmentTaking.status.notStarted',
}

export default function StatusPill({ status }: { status: QuestionStatus }) {
  const t = useTranslations()
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${styles[status]}`}>
      {t(labelKeys[status])}
    </span>
  )
}
