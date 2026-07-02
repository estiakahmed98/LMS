"use client"

import AdminLayout from "@/components/AdminLayout"
import { courseRecords } from "@/lib/admin-panel-data"
import { Archive, Copy, GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

function courseStatusClass(status: string) {
  if (status === "Published") return "border-green-200 bg-green-50 text-green-700"
  if (status === "Draft") return "border-yellow-200 bg-yellow-50 text-yellow-800"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

export default function AdminCoursesPage() {
  const [selectedCourse, setSelectedCourse] = useState(courseRecords[0])

  return (
    <AdminLayout title="Courses">
      <div className="grid gap-6 p-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-card-foreground">Courses</h1>
            <button className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              New Course
            </button>
          </div>

          <div className="space-y-3">
            {courseRecords.map((course) => (
              <button
                key={course.title}
                onClick={() => setSelectedCourse(course)}
                className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                  selectedCourse.title === course.title ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-card-foreground">{course.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{course.enrolled} enrolled</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${courseStatusClass(course.status)}`}>
                    {course.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </span>
                  <span className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold">
                    <Copy className="h-3.5 w-3.5" />
                    Duplicate
                  </span>
                  <span className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section key={selectedCourse.title} className="rounded-lg border border-border bg-card p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Edit Course</p>
              <h2 className="text-2xl font-bold text-card-foreground">{selectedCourse.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selectedCourse.description}</p>
            </div>
            <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
              <Archive className="h-4 w-4" />
              Publish State
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block text-sm font-medium text-card-foreground">
              Course Title
              <input
                defaultValue={selectedCourse.title}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <label className="block text-sm font-medium text-card-foreground">
              Category
              <select
                defaultValue={selectedCourse.category}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option>Healthcare</option>
                <option>Human Resources</option>
                <option>Public Health</option>
                <option>Emergency Care</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-card-foreground">
            Description
            <textarea
              defaultValue={selectedCourse.description}
              rows={3}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>

          <div className="mt-6 rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="font-semibold text-card-foreground">Lesson Sequencer</h3>
                <p className="text-sm text-muted-foreground">Drag-ready order with per-lesson quiz state.</p>
              </div>
              <button className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                Add Lesson
              </button>
            </div>

            <div className="divide-y divide-border">
              {selectedCourse.lessons.map((lesson) => (
                <div key={lesson.order} className="grid gap-3 px-4 py-3 md:grid-cols-[36px_1fr_90px_110px] md:items-center">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-card-foreground">
                      {lesson.order}. {lesson.title}
                    </p>
                    <p className="text-xs text-muted-foreground">Module lesson</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{lesson.duration}</span>
                  <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium">
                    Quiz {lesson.quiz ? "on" : "off"}
                    <input type="checkbox" defaultChecked={lesson.quiz} />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-background p-4">
            <h3 className="font-semibold text-card-foreground">Module Prerequisites</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Lesson 2 unlocks only after Lesson 1 is marked complete. Lesson 3 unlocks after passing the
              Lesson 2 practice quiz.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                <option>Lesson 2 unlock rule</option>
                <option>After Lesson 1 complete</option>
              </select>
              <select className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                <option>Lesson 3 unlock rule</option>
                <option>After Lesson 2 quiz pass</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
