'use client'

import PublicNav from '@/components/learner/PublicNav'
import { mockCourses, mockModules } from '@/lib/mock-data'
import { Clock, Layers } from 'lucide-react'

export default function EnrollPage() {

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-card-foreground mb-2">
          Course Catalog
        </h1>
        <p className="text-muted-foreground mb-8">
          Browse and enroll in courses to start your learning journey.
        </p>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCourses.map((course) => {
            const moduleCount = mockModules.filter((m) => m.courseId === course.id).length
            return (
              <div
                key={course.id}
                className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/10 p-4 flex flex-col justify-end">
                  <h3 className="font-bold text-lg text-card-foreground">
                    {course.title}
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="w-4 h-4" />
                      {moduleCount} modules
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.duration}h
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      Free
                    </span>
                  </div>
                  <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                    Enroll
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
