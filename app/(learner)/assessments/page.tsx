'use client'

import Link from 'next/link'
import {
  getEnrollmentsByUserId,
  getAssessmentsByCourseId,
  getCourseById,
  getSubmissionsByUserId,
} from '@/lib/mock-data'
import { getCurrentUser } from '@/lib/auth'
import { FileText } from 'lucide-react'

export default function AssessmentsPage() {
  const currentUser = getCurrentUser()
  const enrollments = getEnrollmentsByUserId(currentUser?.id ?? '').filter(
    (e) => e.status === 'APPROVED'
  )
  const submissions = getSubmissionsByUserId(currentUser?.id ?? '')

  const assessments = enrollments.flatMap((enrollment) => {
    const course = getCourseById(enrollment.courseId)
    return getAssessmentsByCourseId(enrollment.courseId).map((assessment) => ({
      assessment,
      course,
    }))
  })

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Assessments</h1>

      <div className="space-y-3">
        {assessments.map(({ assessment, course }) => {
          const submission = submissions.find((s) => s.assessmentId === assessment.id)
          return (
            <Link
              key={assessment.id}
              href={`/assessments/${assessment.id}`}
              className="flex items-center justify-between gap-4 bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <p className="font-semibold text-card-foreground">{assessment.title}</p>
                  <p className="text-sm text-muted-foreground">{course?.title}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {submission?.status ?? 'Not Started'}
              </span>
            </Link>
          )
        })}
      </div>

      {assessments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No assessments assigned yet.</p>
        </div>
      )}
    </>
  )
}
