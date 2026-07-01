'use client'

import AdminLayout from '@/components/AdminLayout'
import { mockCourses } from '@/lib/mock-data'
import { Plus } from 'lucide-react'

export default function AdminCoursesPage() {

  return (
    <AdminLayout title='Courses'>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-card-foreground">Courses</h1>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
            <Plus className="w-5 h-5" />
            Add Course
          </button>
        </div>

        <div className="grid gap-6">
          {mockCourses.map((course) => (
            <div key={course.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">{course.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                </div>
                <span className="text-sm font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full">
                  {course.level}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Duration: {course.duration}h</span>
                <span>Created: {course.createdAt.toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
