"use client";

import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import {
  courseRecords,
  type AdminCourseModule,
  type AdminModuleNote,
  type AdminModuleResource,
  type AdminQuizQuestion,
} from "@/lib/admin-panel-data";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Image as ImageIcon,
  Paperclip,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Course = (typeof courseRecords)[number];
type Tab = "overview" | "notes" | "resources" | "quiz";

const resourceTypes: AdminModuleResource["type"][] = [
  "PDF",
  "LINK",
  "SLIDES",
  "FILE",
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminModuleDetailPage({
  courseId,
  moduleId,
}: {
  courseId: string;
  moduleId: string;
}) {
  const t = useTranslations("adminCoursesPage");
  const tAdmin = useTranslations("admin");
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(courseRecords);
  const [tab, setTab] = useState<Tab>("overview");
  const [notice, setNotice] = useState(t("notice.ready"));
  const [deleteNoteTarget, setDeleteNoteTarget] =
    useState<AdminModuleNote | null>(null);
  const [deleteResourceTarget, setDeleteResourceTarget] =
    useState<AdminModuleResource | null>(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] =
    useState<AdminQuizQuestion | null>(null);

  const course = courses.find((item) => item.id === courseId);
  const module = course?.modules.find((item) => item.id === moduleId);

  function updateModule(patch: Partial<AdminCourseModule>) {
    setCourses((current) =>
      current.map((item) =>
        item.id === courseId
          ? {
              ...item,
              modules: item.modules.map((m) =>
                m.id === moduleId ? { ...m, ...patch } : m,
              ),
            }
          : item,
      ),
    );
  }

  if (!course || !module) {
    return (
      <AdminLayout title={tAdmin("courses")}>
        <div className="space-y-4 p-6">
          <button
            onClick={() => router.push("/admin/courses")}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("modulesPage.back")}
          </button>
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            {t("modulesPage.notFound")}
          </div>
        </div>
      </AdminLayout>
    );
  }

  function saveOverview() {
    setNotice(t("notice.saved"));
  }

  function saveVideo() {
    setNotice(t("moduleDetail.videoSaved"));
  }

  function addNote() {
    const note: AdminModuleNote = {
      id: `${module!.id}-note-${Date.now()}`,
      heading: t("moduleDetail.notes.newHeading"),
      body: "",
    };
    updateModule({ notes: [...module!.notes, note] });
  }

  function updateNote(id: string, patch: Partial<AdminModuleNote>) {
    updateModule({
      notes: module!.notes.map((note) =>
        note.id === id ? { ...note, ...patch } : note,
      ),
    });
  }

  function deleteNote(note: AdminModuleNote) {
    updateModule({ notes: module!.notes.filter((n) => n.id !== note.id) });
    setDeleteNoteTarget(null);
    setNotice(t("notice.deleted"));
  }

  function addResource() {
    const resource: AdminModuleResource = {
      id: `${module!.id}-res-${Date.now()}`,
      title: t("moduleDetail.resources.newTitle"),
      type: "PDF",
      meta: "",
    };
    updateModule({ resources: [...module!.resources, resource] });
  }

  async function uploadResourceFile(file: File) {
    const dataUrl = await readFileAsDataUrl(file);
    const resource: AdminModuleResource = {
      id: `${module!.id}-res-${Date.now()}`,
      title: file.name,
      type: "FILE",
      meta: formatFileSize(file.size),
      fileUrl: dataUrl,
    };
    updateModule({ resources: [...module!.resources, resource] });
    setNotice(t("moduleDetail.resources.uploaded", { title: file.name }));
  }

  function updateResource(id: string, patch: Partial<AdminModuleResource>) {
    updateModule({
      resources: module!.resources.map((resource) =>
        resource.id === id ? { ...resource, ...patch } : resource,
      ),
    });
  }

  function deleteResource(resource: AdminModuleResource) {
    updateModule({
      resources: module!.resources.filter((r) => r.id !== resource.id),
    });
    setDeleteResourceTarget(null);
    setNotice(t("notice.deleted"));
  }

  function addQuestion() {
    const question: AdminQuizQuestion = {
      id: `${module!.id}-q-${Date.now()}`,
      question: t("moduleDetail.quiz.newQuestion"),
      options: ["", "", "", ""],
      correctIndex: 0,
      marks: 5,
    };
    updateModule({
      quiz: {
        ...module!.quiz,
        questions: [...module!.quiz.questions, question],
      },
    });
  }

  function updateQuestion(id: string, patch: Partial<AdminQuizQuestion>) {
    updateModule({
      quiz: {
        ...module!.quiz,
        questions: module!.quiz.questions.map((question) =>
          question.id === id ? { ...question, ...patch } : question,
        ),
      },
    });
  }

  function deleteQuestion(question: AdminQuizQuestion) {
    updateModule({
      quiz: {
        ...module!.quiz,
        questions: module!.quiz.questions.filter((q) => q.id !== question.id),
      },
    });
    setDeleteQuestionTarget(null);
    setNotice(t("notice.deleted"));
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: t("moduleDetail.tabs.overview") },
    { key: "notes", label: t("moduleDetail.tabs.notes") },
    { key: "resources", label: t("moduleDetail.tabs.resources") },
    { key: "quiz", label: t("moduleDetail.tabs.quiz") },
  ];

  return (
    <AdminLayout title={tAdmin("courses")}>
      <div className="space-y-6 p-6">
        <Link
          href={`/admin/courses/${course.id}`}
          className="flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("moduleDetail.backToModules", { courseTitle: course.title })}
        </Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("modulesPage.moduleOrder", { order: module.order })}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-card-foreground">
            {module.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{notice}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
            <Video className="h-4 w-4 text-primary" />
            {t("moduleDetail.videoTitle")}
          </h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={module.videoUrl}
              onChange={(event) =>
                updateModule({ videoUrl: event.target.value })
              }
              placeholder={t("moduleDetail.videoPlaceholder")}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <button
              onClick={saveVideo}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Save className="h-4 w-4" />
              {t("editor.save")}
            </button>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
              <Upload className="h-4 w-4" />
              {t("moduleDetail.videoUpload")}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await readFileAsDataUrl(file);
                  updateModule({ videoUrl: dataUrl });
                  setNotice(t("moduleDetail.videoSaved"));
                }}
              />
            </label>
          </div>
          {module.videoUrl && (
            <video
              key={module.videoUrl}
              src={module.videoUrl}
              controls
              className="mt-4 aspect-video w-full rounded-lg bg-black"
            />
          )}

          <div className="mt-5 border-t border-border pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <ImageIcon className="h-4 w-4 text-primary" />
              {t("moduleDetail.coverTitle")}
            </h3>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                <Image
                  src={module.coverImage || "/assets/module_image.jpg"}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
                <Upload className="h-4 w-4" />
                {t("moduleDetail.coverUpload")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const dataUrl = await readFileAsDataUrl(file);
                    updateModule({ coverImage: dataUrl });
                    setNotice(t("moduleDetail.coverSaved"));
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-b border-border">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                tab === item.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-card-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="grid gap-3">
              <input
                value={module.title}
                onChange={(event) =>
                  updateModule({ title: event.target.value })
                }
                placeholder={t("modulesPage.fields.title")}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={module.order}
                  onChange={(event) =>
                    updateModule({ order: Number(event.target.value) })
                  }
                  type="number"
                  min={1}
                  placeholder={t("modulesPage.fields.order")}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
                <input
                  value={module.duration}
                  onChange={(event) =>
                    updateModule({ duration: event.target.value })
                  }
                  placeholder={t("modulesPage.fields.duration")}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </div>
              <textarea
                value={module.overview}
                onChange={(event) =>
                  updateModule({ overview: event.target.value })
                }
                placeholder={t("modulesPage.fields.overview")}
                rows={5}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                {t("modulesPage.fields.hasQuiz")}
                <input
                  type="checkbox"
                  checked={module.hasQuiz}
                  onChange={(event) =>
                    updateModule({ hasQuiz: event.target.checked })
                  }
                />
              </label>
              <button
                onClick={saveOverview}
                className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <Save className="h-4 w-4" />
                {t("editor.save")}
              </button>
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                onClick={addNote}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                {t("moduleDetail.notes.add")}
              </button>
            </div>
            {module.notes.length === 0 && (
              <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
                {t("moduleDetail.notes.empty")}
              </p>
            )}
            {module.notes.map((note) => (
              <div
                key={note.id}
                className="space-y-3 rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-center gap-3">
                  <input
                    value={note.heading}
                    onChange={(event) =>
                      updateNote(note.id, { heading: event.target.value })
                    }
                    placeholder={t("moduleDetail.notes.headingPlaceholder")}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
                  />
                  <button
                    onClick={() => setDeleteNoteTarget(note)}
                    className="rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                    aria-label={t("actions.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={note.body}
                  onChange={(event) =>
                    updateNote(note.id, { body: event.target.value })
                  }
                  placeholder={t("moduleDetail.notes.bodyPlaceholder")}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {tab === "resources" && (
          <div className="space-y-3">
            <div className="flex justify-end gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                <Upload className="h-4 w-4" />
                {t("moduleDetail.resources.upload")}
                <input
                  type="file"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    await uploadResourceFile(file);
                    event.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={addResource}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                {t("moduleDetail.resources.add")}
              </button>
            </div>
            {module.resources.length === 0 && (
              <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
                {t("moduleDetail.resources.empty")}
              </p>
            )}
            {module.resources.map((resource) => (
              <div
                key={resource.id}
                className="space-y-2 rounded-lg border border-border bg-card p-5"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_120px_1fr_36px] md:items-center">
                  <input
                    value={resource.title}
                    onChange={(event) =>
                      updateResource(resource.id, {
                        title: event.target.value,
                      })
                    }
                    placeholder={t("moduleDetail.resources.titlePlaceholder")}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <select
                    value={resource.type}
                    onChange={(event) =>
                      updateResource(resource.id, {
                        type: event.target
                          .value as AdminModuleResource["type"],
                      })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {resourceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input
                    value={resource.meta}
                    onChange={(event) =>
                      updateResource(resource.id, { meta: event.target.value })
                    }
                    placeholder={t("moduleDetail.resources.metaPlaceholder")}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => setDeleteResourceTarget(resource)}
                    className="rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                    aria-label={t("actions.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {resource.fileUrl && (
                  <a
                    href={resource.fileUrl}
                    download={resource.title}
                    className="flex w-fit items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {t("moduleDetail.resources.fileAttached")}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "quiz" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-5">
              <label className="flex items-center gap-3 text-sm font-medium">
                {t("moduleDetail.quiz.passingScore")}
                <input
                  value={module.quiz.passingScore}
                  onChange={(event) =>
                    updateModule({
                      quiz: {
                        ...module.quiz,
                        passingScore: Number(event.target.value),
                      },
                    })
                  }
                  type="number"
                  min={0}
                  max={100}
                  className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <span className="text-sm font-medium text-muted-foreground">
                {t("moduleDetail.quiz.totalMarks", {
                  total: module.quiz.questions.reduce(
                    (sum, question) => sum + question.marks,
                    0,
                  ),
                })}
              </span>
              <button
                onClick={addQuestion}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                {t("moduleDetail.quiz.addQuestion")}
              </button>
            </div>
            {module.quiz.questions.length === 0 && (
              <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
                {t("moduleDetail.quiz.empty")}
              </p>
            )}
            {module.quiz.questions.map((question, qIndex) => (
              <div
                key={question.id}
                className="space-y-3 rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {t("moduleDetail.quiz.questionBadge", {
                      number: qIndex + 1,
                    })}
                  </span>
                  <input
                    value={question.question}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        question: event.target.value,
                      })
                    }
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {t("moduleDetail.quiz.marks")}
                    <input
                      value={question.marks}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          marks: Number(event.target.value),
                        })
                      }
                      type="number"
                      min={0}
                      className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                    />
                  </label>
                  <button
                    onClick={() => setDeleteQuestionTarget(question)}
                    className="rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                    aria-label={t("actions.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, oIndex) => (
                    <label
                      key={oIndex}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <input
                        type="radio"
                        name={`${question.id}-correct`}
                        checked={question.correctIndex === oIndex}
                        onChange={() =>
                          updateQuestion(question.id, { correctIndex: oIndex })
                        }
                      />
                      <input
                        value={option}
                        onChange={(event) =>
                          updateQuestion(question.id, {
                            options: question.options.map((item, itemIndex) =>
                              itemIndex === oIndex
                                ? event.target.value
                                : item,
                            ),
                          })
                        }
                        placeholder={t("moduleDetail.quiz.optionPlaceholder", {
                          letter: String.fromCharCode(65 + oIndex),
                        })}
                        className="flex-1 bg-transparent text-sm outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {deleteNoteTarget && (
          <StudentConfirmModal
            title={t("moduleDetail.notes.deleteTitle")}
            description={t("moduleDetail.notes.deleteDescription", {
              heading: deleteNoteTarget.heading,
            })}
            confirmLabel={t("confirm.deleteConfirm")}
            cancelLabel={t("confirm.cancel")}
            danger
            onCancel={() => setDeleteNoteTarget(null)}
            onConfirm={() => deleteNote(deleteNoteTarget)}
          />
        )}

        {deleteResourceTarget && (
          <StudentConfirmModal
            title={t("moduleDetail.resources.deleteTitle")}
            description={t("moduleDetail.resources.deleteDescription", {
              title: deleteResourceTarget.title,
            })}
            confirmLabel={t("confirm.deleteConfirm")}
            cancelLabel={t("confirm.cancel")}
            danger
            onCancel={() => setDeleteResourceTarget(null)}
            onConfirm={() => deleteResource(deleteResourceTarget)}
          />
        )}

        {deleteQuestionTarget && (
          <StudentConfirmModal
            title={t("moduleDetail.quiz.deleteTitle")}
            description={t("moduleDetail.quiz.deleteDescription")}
            confirmLabel={t("confirm.deleteConfirm")}
            cancelLabel={t("confirm.cancel")}
            danger
            onCancel={() => setDeleteQuestionTarget(null)}
            onConfirm={() => deleteQuestion(deleteQuestionTarget)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
