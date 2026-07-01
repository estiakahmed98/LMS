'use client'

import Link from 'next/link'
import {
  getEnrollmentsByUserId,
  getCourseById,
  getModulesByCourseId,
  getCertificatesByUserId,
} from '@/lib/mock-data'
import { getCurrentUser } from '@/lib/auth'
import { Clock, Users, Award, Play } from 'lucide-react'

export default function DashboardPage() {
  const currentUser = getCurrentUser()
  const userEnrollments = getEnrollmentsByUserId(currentUser?.id ?? '')
    .filter((e) => e.status === 'APPROVED')
    .sort((a, b) => b.progress - a.progress)

  // Get continue where you left off (highest progress but not completed)
  const continueEnrollment = userEnrollments.find((e) => e.progress < 100 && e.progress > 0)
  const continueCourse = continueEnrollment ? getCourseById(continueEnrollment.courseId) : null
  const continueModule = continueCourse ? getModulesByCourseId(continueCourse.id)[0] : undefined

  const certificates = getCertificatesByUserId(currentUser?.id ?? '')

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, <span className="text-primary">{currentUser?.name}</span>
        </h1>
        <p className="text-muted-foreground">
          Continue where you left off.
        </p>
      </div>

      {/* Continue Where You Left Off */}
      {continueCourse && continueEnrollment && (
        <div className="mb-8 bg-card rounded-xl p-6 border border-border flex flex-col sm:flex-row gap-6">
          <div className="w-full sm:w-48 h-32 shrink-0 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Play className="w-5 h-5 ml-0.5" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-muted-foreground mb-1">
              Continue where you left off
            </h2>
            <h3 className="text-2xl font-bold text-primary mb-1">{continueCourse.title}</h3>
            {continueModule && (
              <p className="text-sm text-muted-foreground mb-4">{continueModule.title}</p>
            )}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${continueEnrollment.progress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-primary">{continueEnrollment.progress}%</span>
              <Link
                href={
                  continueModule
                    ? `/courses/${continueCourse.id}/module/${continueModule.id}`
                    : `/courses/${continueCourse.id}`
                }
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm"
              >
                <Play className="w-4 h-4" />
                Resume
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Enrolled Courses Grid */}
      <div id="courses">
        <h2 className="text-2xl font-bold mb-6">My Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userEnrollments.map((enrollment) => {
            const course = getCourseById(enrollment.courseId)
            if (!course) return null
            const firstModule = getModulesByCourseId(course.id)[0]
            const certificate = certificates.find((c) => c.courseId === course.id)
            const isCompleted = enrollment.progress === 100

            return (
              <div
                key={enrollment.id}
                className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Course Header */}
                <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/10 p-4 flex flex-col justify-end">
                  <h3 className="font-bold text-lg text-card-foreground">{course.title}</h3>
                </div>

                {/* Course Details */}
                <div className="p-4 space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration}h</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>•••</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Progress</span>
                      <span className="text-sm font-bold text-green-600">{enrollment.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all"
                        style={{ width: `${enrollment.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="pt-2 flex items-center gap-2">
                    {isCompleted ? (
                      <>
                        <Award className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">Completed</span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-primary">In Progress</span>
                    )}
                  </div>

                  {/* Action Button */}
                  <Link
                    href={
                      isCompleted && certificate
                        ? `/certificates/${certificate.id}`
                        : firstModule
                          ? `/courses/${course.id}/module/${firstModule.id}`
                          : `/courses/${course.id}`
                    }
                    className="block w-full text-center mt-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium text-sm"
                  >
                    {isCompleted ? 'View Certificate' : 'Resume'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {userEnrollments.length === 0 && (
          <div className="text-center py-12">
            <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">
              No courses enrolled yet. Explore our course catalog to get started!
            </p>
          </div>
        )}
      </div>
    </>
  )
}
