"use client"

import AdminLayout from "@/components/AdminLayout"
import { courseRecords } from "@/lib/admin-panel-data"
import { Archive, Copy, GripVertical, Plus, Save, Trash2 } from "lucide-react"
import { useState } from "react"

type Course = (typeof courseRecords)[number]
type Lesson = Course["lessons"][number]

function statusClass(status: string) {
  if (status === "Published") return "border-green-200 bg-green-50 text-green-700"
  if (status === "Draft") return "border-yellow-200 bg-yellow-50 text-yellow-800"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function cloneCourse(course: Course, suffix = "Copy"): Course {
  return {
    ...course,
    title: `${course.title} ${suffix}`,
    status: "Draft",
    enrolled: 0,
    lessons: course.lessons.map((lesson) => ({ ...lesson })),
  }
}

export default function CoursesCrudPage() {
  const [courses, setCourses] = useState<Course[]>(courseRecords)
  const [selectedTitle, setSelectedTitle] = useState(courseRecords[0].title)
  const [draft, setDraft] = useState<Course>(courseRecords[0])
  const [notice, setNotice] = useState("Ready")

  function selectCourse(course: Course) {
    setSelectedTitle(course.title)
    setDraft({ ...course, lessons: course.lessons.map((lesson) => ({ ...lesson })) })
    setNotice(`Editing ${course.title}`)
  }

  function saveCourse() {
    if (!draft.title.trim()) {
      setNotice("Course title is required.")
      return
    }
    setCourses((current) => {
      const exists = current.some((course) => course.title === selectedTitle)
      return exists
        ? current.map((course) => (course.title === selectedTitle ? draft : course))
        : [draft, ...current]
    })
    setSelectedTitle(draft.title)
    setNotice("Course saved in mock state.")
  }

  function newCourse() {
    const next: Course = {
      title: `New Course ${courses.length + 1}`,
      category: "Healthcare",
      enrolled: 0,
      status: "Draft",
      description: "New mock course description.",
      lessons: [{ order: 1, title: "New Lesson", duration: "10 min", quiz: false }],
    }
    setDraft(next)
    setSelectedTitle(next.title)
    setNotice("New course draft ready.")
  }

  function deleteCourse(title: string) {
    const next = courses.filter((course) => course.title !== title)
    setCourses(next)
    if (next[0]) selectCourse(next[0])
    setNotice("Course deleted from mock state.")
  }

  function duplicateCourse(course: Course) {
    const copy = cloneCourse(course)
    setCourses((current) => [copy, ...current])
    selectCourse(copy)
    setNotice("Course duplicated as draft.")
  }

  function updateLesson(index: number, patch: Partial<Lesson>) {
    setDraft((current) => ({
      ...current,
      lessons: current.lessons.map((lesson, lessonIndex) =>
        lessonIndex === index ? { ...lesson, ...patch } : lesson,
      ),
    }))
  }

  function addLesson() {
    setDraft((current) => ({
      ...current,
      lessons: [
        ...current.lessons,
        { order: current.lessons.length + 1, title: `Lesson ${current.lessons.length + 1}`, duration: "12 min", quiz: false },
      ],
    }))
  }

  return (
    <AdminLayout title="Courses">
      <div className="grid gap-6 p-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-card-foreground">Courses</h1>
            <button onClick={newCourse} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" />
              New Course
            </button>
          </div>

          <div className="space-y-3">
            {courses.map((course) => (
              <div key={course.title} className={`rounded-lg border p-4 ${selectedTitle === course.title ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                <button onClick={() => selectCourse(course)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-card-foreground">{course.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{course.enrolled} enrolled</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(course.status)}`}>{course.status}</span>
                  </div>
                </button>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => selectCourse(course)} className="rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:bg-muted">
                    Edit
                  </button>
                  <button onClick={() => duplicateCourse(course)} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:bg-muted">
                    <Copy className="h-3.5 w-3.5" />
                    Duplicate
                  </button>
                  <button onClick={() => deleteCourse(course.title)} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-destructive hover:bg-muted">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Edit Course</p>
              <h2 className="text-2xl font-bold text-card-foreground">{draft.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{notice}</p>
            </div>
            <div className="flex gap-2">
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option>Published</option>
                <option>Draft</option>
                <option>Archived</option>
              </select>
              <button onClick={saveCourse} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>Healthcare</option>
              <option>Human Resources</option>
              <option>Public Health</option>
              <option>Emergency Care</option>
            </select>
          </div>

          <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />

          <div className="mt-6 rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="font-semibold text-card-foreground">Lesson Sequencer</h3>
                <p className="text-sm text-muted-foreground">Add, edit, remove, and toggle quiz state.</p>
              </div>
              <button onClick={addLesson} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">Add Lesson</button>
            </div>

            <div className="divide-y divide-border">
              {draft.lessons.map((lesson, index) => (
                <div key={`${lesson.order}-${index}`} className="grid gap-3 px-4 py-3 md:grid-cols-[36px_1fr_100px_120px_36px] md:items-center">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <input value={lesson.title} onChange={(event) => updateLesson(index, { title: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <input value={lesson.duration} onChange={(event) => updateLesson(index, { duration: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium">
                    Quiz {lesson.quiz ? "on" : "off"}
                    <input type="checkbox" checked={lesson.quiz} onChange={(event) => updateLesson(index, { quiz: event.target.checked })} />
                  </label>
                  <button
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        lessons: current.lessons.filter((_, lessonIndex) => lessonIndex !== index).map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })),
                      }))
                    }
                    className="rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                    aria-label="Delete lesson"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-background p-4">
            <h3 className="font-semibold text-card-foreground">Module Prerequisites</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                <option>Lesson 2 unlocks after Lesson 1 complete</option>
                <option>Unlock by admin only</option>
              </select>
              <select className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                <option>Lesson 3 unlocks after Lesson 2 quiz pass</option>
                <option>No prerequisite</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
