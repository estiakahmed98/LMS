"use client";

import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import type {
  AdminCourseDetail,
  AdminModuleDetail,
  AdminModulePayload,
  AdminModuleResourceItem,
  ResourceTypeValue,
} from "@/lib/admin-course-types";
import {
  fetchCourse,
  updateModule,
  uploadAdminFile,
} from "@/lib/admin-course-client";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Image as ImageIcon,
  LoaderCircle,
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
import { useEffect, useState } from "react";

type Tab = "overview" | "notes" | "resources" | "quiz";

const resourceTypes: ResourceTypeValue[] = ["PDF", "LINK", "SLIDES", "FILE"];

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readVideoDurationMinutes(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(Math.max(1, Math.round(video.duration / 60)));
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Could not read video duration."));
    };
    video.src = URL.createObjectURL(file);
  });
}

function toDraft(module: AdminModuleDetail): AdminModulePayload {
  return {
    title: module.title,
    order: module.order,
    type: module.type,
    durationMinutes: module.durationMinutes,
    coverImage: module.coverImage,
    videoUrl: module.videoUrl,
    overview: module.overview,
    hasQuiz: module.hasQuiz,
    notes: module.notes.map((note) => ({ ...note })),
    resources: module.resources.map((resource) => ({ ...resource })),
    quiz: module.quiz
      ? {
          passingScore: module.quiz.passingScore,
          questions: module.quiz.questions.map((question) => ({
            ...question,
            options: [...question.options],
          })),
        }
      : { passingScore: 70, questions: [] },
  };
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
  const [course, setCourse] = useState<AdminCourseDetail | null>(null);
  const [draft, setDraft] = useState<AdminModulePayload | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [notice, setNotice] = useState("Loading module...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  const module = course?.modules.find((item) => item.id === moduleId) ?? null;

  async function loadModule() {
    try {
      setLoading(true);
      const data = await fetchCourse(courseId);
      const currentModule = data.modules.find((item) => item.id === moduleId);
      if (!currentModule) {
        setCourse(null);
        setDraft(null);
        setNotice(t("modulesPage.notFound"));
        return;
      }
      setCourse(data);
      setDraft(toDraft(currentModule));
      setNotice("Module loaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to load module.");
      setCourse(null);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadModule();
  }, [courseId, moduleId]);

  async function handleSave() {
    if (!draft) {
      return;
    }

    try {
      setSaving(true);
      await updateModule(courseId, moduleId, draft);
      setNotice(t("notice.saved"));
      await loadModule();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save module.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVideoUpload(file: File) {
    try {
      setUploading(true);
      const [upload, durationMinutes] = await Promise.all([
        uploadAdminFile(file, "course-modules"),
        readVideoDurationMinutes(file).catch(() => null),
      ]);
      setDraft((current) =>
        current
          ? {
              ...current,
              videoUrl: upload.url,
              durationMinutes: durationMinutes ?? current.durationMinutes,
            }
          : current,
      );
      setNotice(
        durationMinutes
          ? `Uploaded ${upload.name} — duration detected as ${durationMinutes} min. Save to persist this video.`
          : `Uploaded ${upload.name}. Save to persist this video.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCoverUpload(file: File) {
    try {
      setUploading(true);
      const upload = await uploadAdminFile(file, "course-modules");
      setDraft((current) =>
        current ? { ...current, coverImage: upload.url } : current,
      );
      setNotice(`Uploaded ${upload.name}. Save to persist this image.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleResourceUpload(file: File) {
    try {
      setUploading(true);
      const upload = await uploadAdminFile(file, "course-resources");
      const resource: AdminModuleResourceItem = {
        id: makeId("resource"),
        title: file.name,
        type: "FILE",
        meta: formatFileSize(file.size),
        fileUrl: upload.url,
      };
      setDraft((current) =>
        current ? { ...current, resources: [...current.resources, resource] } : current,
      );
      setNotice(t("moduleDetail.resources.uploaded", { title: file.name }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (!loading && (!course || !module || !draft)) {
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

  const activeQuiz = draft?.quiz ?? { passingScore: 70, questions: [] };

  return (
    <AdminLayout title={tAdmin("courses")}>
      <div className="space-y-6 p-6">
        <Link
          href={`/admin/courses/${courseId}`}
          className="flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {course ? t("moduleDetail.backToModules", { courseTitle: course.title }) : t("modulesPage.back")}
        </Link>

        {loading || !draft || !module ? (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card">
            <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t("modulesPage.moduleOrder", { order: draft.order })}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-card-foreground">
                {draft.title || module.title}
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
                  value={draft.videoUrl ?? ""}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, videoUrl: event.target.value } : current,
                    )
                  }
                  placeholder={t("moduleDetail.videoPlaceholder")}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t("editor.save")}
                </button>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
                  {uploading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {t("moduleDetail.videoUpload")}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }
                      void handleVideoUpload(file);
                    }}
                  />
                </label>
              </div>
              {draft.videoUrl && (
                <video
                  key={draft.videoUrl}
                  src={draft.videoUrl}
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
                      src={draft.coverImage || "/assets/module_image.jpg"}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
                    {uploading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {t("moduleDetail.coverUpload")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }
                        void handleCoverUpload(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-b border-border">
              {[
                { key: "overview", label: t("moduleDetail.tabs.overview") },
                { key: "notes", label: t("moduleDetail.tabs.notes") },
                { key: "resources", label: t("moduleDetail.tabs.resources") },
                { key: "quiz", label: t("moduleDetail.tabs.quiz") },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key as Tab)}
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
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, title: event.target.value } : current,
                      )
                    }
                    placeholder={t("modulesPage.fields.title")}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      min={1}
                      value={draft.order}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? { ...current, order: Number(event.target.value || 1) }
                            : current,
                        )
                      }
                      placeholder={t("modulesPage.fields.order")}
                      className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      value={draft.durationMinutes}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                durationMinutes: Number(event.target.value || 0),
                              }
                            : current,
                        )
                      }
                      placeholder="Duration in minutes"
                      className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                  </div>
                  <textarea
                    value={draft.overview ?? ""}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, overview: event.target.value } : current,
                      )
                    }
                    placeholder={t("modulesPage.fields.overview")}
                    rows={5}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                  <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                    {t("modulesPage.fields.hasQuiz")}
                    <input
                      type="checkbox"
                      checked={draft.hasQuiz}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                hasQuiz: event.target.checked,
                                quiz: event.target.checked
                                  ? current.quiz ?? { passingScore: 70, questions: [] }
                                  : null,
                              }
                            : current,
                        )
                      }
                    />
                  </label>
                  <button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {saving ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t("editor.save")}
                  </button>
                </div>
              </div>
            )}

            {tab === "notes" && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              notes: [
                                ...current.notes,
                                {
                                  id: makeId("note"),
                                  heading: t("moduleDetail.notes.newHeading"),
                                  body: "",
                                },
                              ],
                            }
                          : current,
                      )
                    }
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    {t("moduleDetail.notes.add")}
                  </button>
                </div>
                {draft.notes.length === 0 && (
                  <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
                    {t("moduleDetail.notes.empty")}
                  </p>
                )}
                {draft.notes.map((note) => (
                  <div
                    key={note.id}
                    className="space-y-3 rounded-lg border border-border bg-card p-5"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        value={note.heading}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  notes: current.notes.map((item) =>
                                    item.id === note.id
                                      ? { ...item, heading: event.target.value }
                                      : item,
                                  ),
                                }
                              : current,
                          )
                        }
                        placeholder={t("moduleDetail.notes.headingPlaceholder")}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
                      />
                      <button
                        onClick={() => setDeleteNoteId(note.id ?? null)}
                        className="rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={note.body}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                notes: current.notes.map((item) =>
                                  item.id === note.id
                                    ? { ...item, body: event.target.value }
                                    : item,
                                ),
                              }
                            : current,
                        )
                      }
                      placeholder={t("moduleDetail.notes.bodyPlaceholder")}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                ))}
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t("editor.save")}
                </button>
              </div>
            )}

            {tab === "resources" && (
              <div className="space-y-3">
                <div className="flex justify-end gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                    {uploading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {t("moduleDetail.resources.upload")}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }
                        void handleResourceUpload(file);
                      }}
                    />
                  </label>
                  <button
                    onClick={() =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              resources: [
                                ...current.resources,
                                {
                                  id: makeId("resource"),
                                  title: t("moduleDetail.resources.newTitle"),
                                  type: "PDF",
                                  meta: "",
                                  fileUrl: null,
                                },
                              ],
                            }
                          : current,
                      )
                    }
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    {t("moduleDetail.resources.add")}
                  </button>
                </div>
                {draft.resources.length === 0 && (
                  <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
                    {t("moduleDetail.resources.empty")}
                  </p>
                )}
                {draft.resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="space-y-2 rounded-lg border border-border bg-card p-5"
                  >
                    <div className="grid gap-3 md:grid-cols-[1fr_120px_1fr_36px] md:items-center">
                      <input
                        value={resource.title}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  resources: current.resources.map((item) =>
                                    item.id === resource.id
                                      ? { ...item, title: event.target.value }
                                      : item,
                                  ),
                                }
                              : current,
                          )
                        }
                        placeholder={t("moduleDetail.resources.titlePlaceholder")}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <select
                        value={resource.type}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  resources: current.resources.map((item) =>
                                    item.id === resource.id
                                      ? {
                                          ...item,
                                          type: event.target.value as ResourceTypeValue,
                                        }
                                      : item,
                                  ),
                                }
                              : current,
                          )
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
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  resources: current.resources.map((item) =>
                                    item.id === resource.id
                                      ? { ...item, meta: event.target.value }
                                      : item,
                                  ),
                                }
                              : current,
                          )
                        }
                        placeholder={t("moduleDetail.resources.metaPlaceholder")}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => setDeleteResourceId(resource.id ?? null)}
                        className="rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Paperclip className="h-4 w-4" />
                        {resource.fileUrl ? "File attached" : "No file attached"}
                      </span>
                      {resource.fileUrl && (
                        <a
                          href={resource.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Open file
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t("editor.save")}
                </button>
              </div>
            )}

            {tab === "quiz" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-card-foreground">
                      Passing score
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={activeQuiz.passingScore}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                hasQuiz: true,
                                quiz: {
                                  passingScore: Number(event.target.value || 0),
                                  questions: current.quiz?.questions ?? [],
                                },
                              }
                            : current,
                        )
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              hasQuiz: true,
                              quiz: {
                                passingScore: current.quiz?.passingScore ?? 70,
                                questions: [
                                  ...(current.quiz?.questions ?? []),
                                  {
                                    id: makeId("question"),
                                    question: t("moduleDetail.quiz.newQuestion"),
                                    options: ["", "", "", ""],
                                    correctIndex: 0,
                                    marks: 5,
                                  },
                                ],
                              },
                            }
                          : current,
                      )
                    }
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    {t("moduleDetail.quiz.addQuestion")}
                  </button>
                </div>

                {activeQuiz.questions.length === 0 && (
                  <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
                    {t("moduleDetail.quiz.empty")}
                  </p>
                )}

                {activeQuiz.questions.map((question) => (
                  <div
                    key={question.id}
                    className="space-y-3 rounded-lg border border-border bg-card p-5"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        value={question.question}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  hasQuiz: true,
                                  quiz: {
                                    passingScore: current.quiz?.passingScore ?? 70,
                                    questions: (current.quiz?.questions ?? []).map((item) =>
                                      item.id === question.id
                                        ? { ...item, question: event.target.value }
                                        : item,
                                    ),
                                  },
                                }
                              : current,
                          )
                        }
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
                      />
                      <input
                        type="number"
                        min={1}
                        value={question.marks}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  hasQuiz: true,
                                  quiz: {
                                    passingScore: current.quiz?.passingScore ?? 70,
                                    questions: (current.quiz?.questions ?? []).map((item) =>
                                      item.id === question.id
                                        ? {
                                            ...item,
                                            marks: Number(event.target.value || 1),
                                          }
                                        : item,
                                    ),
                                  },
                                }
                              : current,
                          )
                        }
                        className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => setDeleteQuestionId(question.id ?? null)}
                        className="rounded-lg border border-border p-2 text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      {question.options.map((option, index) => (
                        <label
                          key={`${question.id}-${index}`}
                          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                        >
                          <input
                            type="radio"
                            checked={question.correctIndex === index}
                            onChange={() =>
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      hasQuiz: true,
                                      quiz: {
                                        passingScore: current.quiz?.passingScore ?? 70,
                                        questions: (current.quiz?.questions ?? []).map((item) =>
                                          item.id === question.id
                                            ? { ...item, correctIndex: index }
                                            : item,
                                        ),
                                      },
                                    }
                                  : current,
                              )
                            }
                          />
                          <input
                            value={option}
                            onChange={(event) =>
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      hasQuiz: true,
                                      quiz: {
                                        passingScore: current.quiz?.passingScore ?? 70,
                                        questions: (current.quiz?.questions ?? []).map((item) =>
                                          item.id === question.id
                                            ? {
                                                ...item,
                                                options: item.options.map((choice, choiceIndex) =>
                                                  choiceIndex === index
                                                    ? event.target.value
                                                    : choice,
                                                ),
                                              }
                                            : item,
                                        ),
                                      },
                                    }
                                  : current,
                              )
                            }
                            placeholder={`Option ${index + 1}`}
                            className="flex-1 bg-transparent text-sm outline-none"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t("editor.save")}
                </button>
              </div>
            )}

            {deleteNoteId && (
              <StudentConfirmModal
                title="Delete note?"
                description="This note will be removed when you save the module."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                danger
                onCancel={() => setDeleteNoteId(null)}
                onConfirm={() => {
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          notes: current.notes.filter((note) => note.id !== deleteNoteId),
                        }
                      : current,
                  );
                  setDeleteNoteId(null);
                }}
              />
            )}

            {deleteResourceId && (
              <StudentConfirmModal
                title="Delete resource?"
                description="This resource will be removed when you save the module."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                danger
                onCancel={() => setDeleteResourceId(null)}
                onConfirm={() => {
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          resources: current.resources.filter(
                            (resource) => resource.id !== deleteResourceId,
                          ),
                        }
                      : current,
                  );
                  setDeleteResourceId(null);
                }}
              />
            )}

            {deleteQuestionId && (
              <StudentConfirmModal
                title="Delete question?"
                description="This quiz question will be removed when you save the module."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                danger
                onCancel={() => setDeleteQuestionId(null)}
                onConfirm={() => {
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          quiz: current.quiz
                            ? {
                                ...current.quiz,
                                questions: current.quiz.questions.filter(
                                  (question) => question.id !== deleteQuestionId,
                                ),
                              }
                            : current.quiz,
                        }
                      : current,
                  );
                  setDeleteQuestionId(null);
                }}
              />
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
