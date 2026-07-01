'use client'

import TopNav from '@/components/TopNav'
import {
  mockUsers,
  mockCourses,
  mockEnrollments,
  getEnrollmentsByUserId,
  getCourseById,
} from '@/lib/mock-data'
import { Clock, Users, Award, Play } from 'lucide-react'

// Mock current user
const currentUserId = 'user_1'

export default function DashboardPage() {

  const currentUser = mockUsers.find((u) => u.id === currentUserId)
  const userEnrollments = getEnrollmentsByUserId(currentUserId)
    .filter((e) => e.status === 'APPROVED')
    .sort((a, b) => b.progress - a.progress)

  // Get continue where you left off (highest progress but not completed)
  const continueEnrollment = userEnrollments.find((e) => e.progress < 100 && e.progress > 0)
  const continueCourse = continueEnrollment ? getCourseById(continueEnrollment.courseId) : null

  return (
    <div className="min-h-screen bg-background">
      <TopNav title="My Courses" />

      <main className="max-w-7xl mx-auto p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-card-foreground mb-2">
            'Learn. Get Certified. Grow with PSTC.'
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {currentUser?.name}! Continue your learning journey.
          </p>
        </div>

        {/* Continue Where You Left Off */}
        {continueCourse && continueEnrollment && (
          <div className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground mb-2">
                  'Continue where you left off'
                </h2>
                <h3 className="text-2xl font-bold text-primary">{continueCourse.title}</h3>
              </div>
              <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                <Play className="w-5 h-5" />
                'Resume'
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Clock className="w-4 h-4" />
              <span>{continueCourse.duration} 'hours'</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-background rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${continueEnrollment.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {continueEnrollment.progress}% 'Progress'
            </p>
          </div>
        )}

        {/* Enrolled Courses Grid */}
        <div>
          <h2 className="text-2xl font-bold text-card-foreground mb-6">
            My Courses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userEnrollments.map((enrollment) => {
              const course = getCourseById(enrollment.courseId)
              if (!course) return null

              return (
                <div
                  key={enrollment.id}
                  className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Course Header */}
                  <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/10 p-4 flex flex-col justify-end">
                    <h3 className="font-bold text-lg text-card-foreground">
                      {course.title}
                    </h3>
                  </div>

                  {/* Course Details */}
                  <div className="p-4 space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>

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
                        <span className="text-xs font-medium text-muted-foreground">
                          'Progress'
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {enrollment.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${enrollment.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="pt-2 flex items-center gap-2">
                      {enrollment.progress === 100 ? (
                        <>
                          <Award className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">
                            'Completed'
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-primary">
                          'In Progress'
                        </span>
                      )}
                    </div>

                    {/* Action Button */}
                    <button className="w-full mt-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium text-sm">
                      {enrollment.progress === 100
                        ? 'View Certificate'
                        : 'Resume'}
                    </button>
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
      </main>
    </div>
  )
}
