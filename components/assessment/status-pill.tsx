export type QuestionStatus = 'ANSWERED' | 'IN_PROGRESS' | 'NOT_STARTED'

const styles: Record<QuestionStatus, string> = {
  ANSWERED: 'bg-green-500/10 text-green-600',
  IN_PROGRESS: 'bg-primary/10 text-primary',
  NOT_STARTED: 'bg-muted text-muted-foreground',
}

const labels: Record<QuestionStatus, string> = {
  ANSWERED: 'Answered',
  IN_PROGRESS: 'In Progress',
  NOT_STARTED: 'Not Started',
}

export default function StatusPill({ status }: { status: QuestionStatus }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
