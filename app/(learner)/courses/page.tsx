'use client'

import Link from 'next/link'
import { getEnrollmentsByUserId, getCourseById, getModulesByCourseId } from '@/lib/mock-data'
import { getCurrentUser } from '@/lib/auth'
import { Clock, Award } from 'lucide-react'

export default function CoursesPage() {
  const currentUser = getCurrentUser()
  const enrollments = getEnrollmentsByUserId(currentUser?.id ?? '').filter(
    (e) => e.status === 'APPROVED'
  )

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">My Courses</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrollments.map((enrollment) => {
          const course = getCourseById(enrollment.courseId)
          if (!course) return null
          const firstModule = getModulesByCourseId(course.id)[0]
          const isCompleted = enrollment.progress === 100

          return (
            <Link
              key={enrollment.id}
              href={firstModule ? `/courses/${course.id}/module/${firstModule.id}` : `/courses/${course.id}`}
              className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/10 p-4 flex flex-col justify-end">
                <h3 className="font-bold text-lg text-card-foreground">{course.title}</h3>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration}h</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full"
                    style={{ width: `${enrollment.progress}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-green-600">{enrollment.progress}%</span>
                  {isCompleted && (
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <Award className="w-4 h-4" /> Completed
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {enrollments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            No courses enrolled yet. Visit the catalog to get started.
          </p>
        </div>
      )}
    </>
  )
}
