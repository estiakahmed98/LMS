'use client'

import TopNav from '@/components/TopNav'
import { mockCourses } from '@/lib/mock-data'
import { BookOpen, Users } from 'lucide-react'

export default function EnrollPage() {

  return (
    <div className="min-h-screen bg-background">
      <TopNav title='Enroll' />

      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-card-foreground mb-2">
          'Enroll'
        </h1>
        <p className="text-muted-foreground mb-8">
          Browse and enroll in courses to start your learning journey.
        </p>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCourses.map((course) => (
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
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{course.duration}h</span>
                  <span>{course.level}</span>
                </div>
                <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                  'Enroll'
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
