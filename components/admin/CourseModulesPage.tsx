"use client";

import { adminFetch as fetch } from "@/lib/admin-swr";

import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import {
  enrollUserInCourse,
  fetchUser,
  fetchUsers,
  unenrollUserFromCourse,
} from "@/lib/admin-user-client";
import type { AdminUserDetail, AdminUserSummary } from "@/lib/admin-user-types";
import type {
  AdminCourseDetail,
  AdminModuleDetail,
  AdminModulePayload,
  ModuleTypeValue,
} from "@/lib/admin-course-types";
import {
  createModule,
  deleteModule,
  fetchCourse,
  updateModule,
  uploadAdminFile,
} from "@/lib/admin-course-client";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Clock,
  FileText,
  LayoutGrid,
  List,
  LoaderCircle,
  Play,
  Plus,
  Search,
  Save,
  Trash2,
  Upload,
  UserRoundPlus,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { parseYouTubeUrl } from "@/lib/youtube";
import YouTubePlayer from "@/components/shared/YouTubePlayer";
import { toast } from "sonner";

type ViewMode = "grid" | "list";
type CourseTab = "modules" | "instructors" | "learners";

type CourseLearner = {
  enrollmentId: string;
  id: string;
  name: string;
  email: string;
  userStatus: string;
  enrollmentStatus: string;
  progress: number;
  enrolledAt: string;
  completedAt: string | null;
  batches: Array<{ id: string; name: string; code: string }>;
};

const moduleTypes: ModuleTypeValue[] = ["VIDEO", "READING", "QUIZ", "PRACTICE"];

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

function prettyEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDraft(
  module: AdminModuleDetail | null,
  nextOrder: number,
): AdminModulePayload {
  if (!module) {
    return {
      title: "",
      order: nextOrder,
      type: "VIDEO",
      durationMinutes: 0,
      coverImage: null,
      videoUrl: null,
      youtubeUrl: null,
      youtubeVideoId: null,
      overview: null,
      hasQuiz: false,
      notes: [],
      resources: [],
      quiz: null,
    };
  }

  return {
    title: module.title,
    order: module.order,
    type: module.type,
    durationMinutes: module.durationMinutes,
    coverImage: module.coverImage,
    videoUrl: module.videoUrl,
    youtubeUrl: module.youtubeUrl,
    youtubeVideoId: module.youtubeVideoId,
    overview: module.overview,
    hasQuiz: module.hasQuiz,
    notes: module.notes,
    resources: module.resources,
    quiz: module.quiz
      ? {
          passingScore: module.quiz.passingScore,
          questions: module.quiz.questions,
        }
      : null,
  };
}

export default function CourseModulesPage({ courseId }: { courseId: string }) {
  const t = useTranslations("adminCoursesPage");
  const tAdmin = useTranslations("admin");
  const { can } = useAdminPermissions();
  const pathname = usePathname();
  const isInstructorPortal = pathname.startsWith("/instructor");
  const coursesPath = isInstructorPortal
    ? "/instructor/courses"
    : "/admin/courses";
  const canCreate = can("COURSES", "create");
  const canEdit = can("COURSES", "edit");
  const canDelete = can("COURSES", "delete");
  const router = useRouter();
  const [course, setCourse] = useState<AdminCourseDetail | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeTab, setActiveTab] = useState<CourseTab>("modules");
  const [notice, setNotice] = useState("Loading course...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminModulePayload>(toDraft(null, 1));
  const [titleError, setTitleError] = useState("");
  const [allInstructors, setAllInstructors] = useState<AdminUserSummary[]>([]);
  const [assignedInstructors, setAssignedInstructors] = useState<
    AdminUserDetail[]
  >([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [instructorQuery, setInstructorQuery] = useState("");
  const [assigningInstructor, setAssigningInstructor] = useState(false);
  const [removingInstructorId, setRemovingInstructorId] = useState<
    string | null
  >(null);
  const [learners, setLearners] = useState<CourseLearner[]>([]);
  const [learnerTotal, setLearnerTotal] = useState(0);
  const [learnerPage, setLearnerPage] = useState(1);
  const [learnerSearch, setLearnerSearch] = useState("");
  const [learnerStatus, setLearnerStatus] = useState("");
  const [learnerBatchId, setLearnerBatchId] = useState("");
  const [learnerBatches, setLearnerBatches] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [enrollMode, setEnrollMode] = useState<"individual" | "batch" | "all">(
    "individual",
  );
  const [enrollBatchId, setEnrollBatchId] = useState("");
  const [availableBatches, setAvailableBatches] = useState<
    Array<{
      id: string;
      name: string;
      code: string;
      _count: { memberships: number };
    }>
  >([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [learnerCandidates, setLearnerCandidates] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [learnerLoading, setLearnerLoading] = useState(false);
  const [learnerMutationId, setLearnerMutationId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminModuleDetail | null>(
    null,
  );
  const [previewModule, setPreviewModule] = useState<AdminModuleDetail | null>(
    null,
  );

  async function loadCourse() {
    try {
      setLoading(true);
      const data = await fetchCourse(courseId);
      setCourse(data);
      setNotice("Course loaded.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to load course.",
      );
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadInstructorAssignments() {
    try {
      const [all, assigned] = await Promise.all([
        fetchUsers("INSTRUCTOR"),
        fetchUsers("INSTRUCTOR", courseId),
      ]);
      const assignedDetails = await Promise.all(
        assigned.map((instructor) => fetchUser(instructor.id)),
      );
      setAllInstructors(all);
      setAssignedInstructors(assignedDetails);
    } catch {
      setAllInstructors([]);
      setAssignedInstructors([]);
    }
  }

  async function loadLearners() {
    const params = new URLSearchParams({
      page: String(learnerPage),
      pageSize: "25",
    });
    if (learnerSearch.trim()) params.set("search", learnerSearch.trim());
    if (learnerStatus) params.set("status", learnerStatus);
    if (learnerBatchId) params.set("batchId", learnerBatchId);
    if (candidateSearch.trim())
      params.set("candidateSearch", candidateSearch.trim());
    try {
      setLearnerLoading(true);
      const response = await fetch(
        `/api/admin/courses/${courseId}/learners?${params}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to load learners.");
      setLearners(data.learners ?? []);
      setLearnerTotal(data.total ?? 0);
      setLearnerBatches(data.batches ?? []);
      setLearnerCandidates(data.candidates ?? []);
      setAvailableBatches(data.availableBatches ?? []);
      setEligibleCount(data.eligibleCount ?? 0);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to load learners.",
      );
    } finally {
      setLearnerLoading(false);
    }
  }

  useEffect(() => {
    void loadCourse();
    if (!isInstructorPortal) {
      void loadInstructorAssignments();
    }
  }, [courseId, isInstructorPortal]);

  useEffect(() => {
    if (activeTab !== "learners" || isInstructorPortal) return;
    const timer = window.setTimeout(() => void loadLearners(), 300);
    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    courseId,
    learnerPage,
    learnerSearch,
    learnerStatus,
    learnerBatchId,
    candidateSearch,
    isInstructorPortal,
  ]);

  const sortedModules = useMemo(
    () => [...(course?.modules ?? [])].sort((a, b) => a.order - b.order),
    [course?.modules],
  );

  const previewVideoId = useMemo(
    () => parseYouTubeUrl(draft.youtubeUrl ?? ""),
    [draft.youtubeUrl],
  );
  const showYoutubeError =
    (draft.youtubeUrl ?? "").trim().length > 0 &&
    /youtu\.?be/i.test(draft.youtubeUrl ?? "") &&
    !previewVideoId;
  const unassignedInstructors = allInstructors.filter(
    (instructor) =>
      !assignedInstructors.some((assigned) => assigned.id === instructor.id),
  );
  const filteredUnassignedInstructors = unassignedInstructors.filter(
    (instructor) => {
      const query = instructorQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        instructor.name.toLowerCase().includes(query) ||
        instructor.email.toLowerCase().includes(query)
      );
    },
  );
  const activeAssignedCount = assignedInstructors.filter(
    (instructor) =>
      instructor.status === "ACTIVE" || instructor.status === "APPROVED",
  ).length;

  function openNewModule() {
    setEditingModuleId(null);
    setDraft(toDraft(null, sortedModules.length + 1));
    setTitleError("");
    setNotice(t("notice.newDraftReady"));
    setIsEditorOpen(true);
  }

  function openEditModule(module: AdminModuleDetail) {
    setEditingModuleId(module.id);
    setDraft(toDraft(module, module.order));
    setTitleError("");
    setNotice(t("notice.editing", { title: module.title }));
    setIsEditorOpen(true);
  }

  async function handleSaveModule() {
    if (!course) {
      return;
    }

    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) {
      const message = "Module title is required.";
      setTitleError(message);
      setNotice(message);
      toast.error(message);
      return;
    }

    try {
      setSaving(true);
      const payload = { ...draft, title: trimmedTitle };
      if (editingModuleId) {
        await updateModule(course.id, editingModuleId, payload);
      } else {
        await createModule(course.id, payload);
      }
      setIsEditorOpen(false);
      setTitleError("");
      setNotice(t("notice.saved"));
      toast.success(t("notice.saved"));
      await loadCourse();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save module.";
      setNotice(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModule() {
    if (!course || !deleteTarget) {
      return;
    }

    try {
      await deleteModule(course.id, deleteTarget.id);
      setDeleteTarget(null);
      setNotice(t("notice.deleted"));
      await loadCourse();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to delete module.",
      );
    }
  }

  async function handleCoverUpload(file: File) {
    try {
      setUploading(true);
      const upload = await uploadAdminFile(file, "course-modules");
      setDraft((current) => ({ ...current, coverImage: upload.url }));
      setNotice(`Uploaded ${upload.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoUpload(file: File) {
    try {
      setUploadingVideo(true);
      const [upload, durationMinutes] = await Promise.all([
        uploadAdminFile(file, "course-modules"),
        readVideoDurationMinutes(file).catch(() => null),
      ]);
      setDraft((current) => ({
        ...current,
        videoUrl: upload.url,
        youtubeUrl: null,
        youtubeVideoId: null,
        durationMinutes: durationMinutes ?? current.durationMinutes,
      }));
      setNotice(
        durationMinutes
          ? `Uploaded ${upload.name} — duration detected as ${durationMinutes} min.`
          : `Uploaded ${upload.name}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Video upload failed.",
      );
    } finally {
      setUploadingVideo(false);
    }
  }

  function handleYoutubeUrlChange(value: string) {
    const videoId = parseYouTubeUrl(value);
    setDraft((current) => ({
      ...current,
      youtubeUrl: value,
      youtubeVideoId: videoId,
      videoUrl: videoId ? null : current.videoUrl,
    }));
  }

  async function handleAssignInstructor() {
    if (!selectedInstructorId || !course) return;

    try {
      setAssigningInstructor(true);
      await enrollUserInCourse(selectedInstructorId, course.id);
      setSelectedInstructorId("");
      await loadInstructorAssignments();
      setNotice("Instructor assigned to this course.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to assign instructor.",
      );
    } finally {
      setAssigningInstructor(false);
    }
  }

  async function handleRemoveInstructor(instructor: AdminUserDetail) {
    const enrollmentId = instructor.enrollments.find(
      (enrollment) => enrollment.courseId === courseId,
    )?.enrollmentId;

    if (!enrollmentId) {
      setNotice(
        "This instructor is assigned via class, not direct course mapping.",
      );
      return;
    }

    try {
      setRemovingInstructorId(instructor.id);
      await unenrollUserFromCourse(instructor.id, enrollmentId);
      await loadInstructorAssignments();
      setNotice("Instructor removed from this course.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to remove instructor.",
      );
    } finally {
      setRemovingInstructorId(null);
    }
  }

  async function handleAssignLearner() {
    if (!selectedLearnerId) return;
    try {
      setLearnerMutationId(selectedLearnerId);
      await enrollUserInCourse(selectedLearnerId, courseId);
      setSelectedLearnerId("");
      setCandidateSearch("");
      setNotice("Learner enrolled successfully.");
      await Promise.all([loadLearners(), loadCourse()]);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to enroll learner.",
      );
    } finally {
      setLearnerMutationId(null);
    }
  }

  async function handleBulkEnrollment() {
    if (
      enrollMode === "individual" ||
      (enrollMode === "batch" && !enrollBatchId)
    )
      return;
    const prompt =
      enrollMode === "all"
        ? `Enroll all ${eligibleCount} eligible learners in this course? This includes active/approved learners across all batches, not just the current table filters. Existing enrollments will not change.`
        : "Assign this course to the selected batch / cohort? All active members will receive access; future members will inherit the course through the cohort.";
    if (!window.confirm(prompt)) return;
    try {
      setLearnerMutationId("bulk");
      const response = await fetch(`/api/admin/courses/${courseId}/learners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: enrollMode,
          batchId: enrollBatchId,
          confirm: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Enrollment failed.");
      setNotice(data.message);
      await Promise.all([loadLearners(), loadCourse()]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Enrollment failed.");
    } finally {
      setLearnerMutationId(null);
    }
  }

  async function handleRemoveLearner(learner: CourseLearner) {
    try {
      setLearnerMutationId(learner.id);
      await unenrollUserFromCourse(learner.id, learner.enrollmentId);
      setNotice("Learner removed from this course.");
      await loadLearners();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to remove learner.",
      );
    } finally {
      setLearnerMutationId(null);
    }
  }

  if (!loading && !course) {
    return (
      <AdminLayout title={tAdmin("courses")}>
        <div className="space-y-4 p-6">
          <button
            onClick={() => router.push(coursesPath)}
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

  return (
    <AdminLayout title={tAdmin("courses")}>
      <div className="space-y-6 p-6">
        <Link
          href={coursesPath}
          className="flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("modulesPage.back")}
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">
              {course?.title || "Courses"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{notice}</p>
          </div>
          {activeTab === "modules" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-1.5 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-1.5 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              {canCreate && (
                <button
                  onClick={openNewModule}
                  className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                  {t("modulesPage.newModule")}
                </button>
              )}
            </div>
          )}
        </div>

        {!isInstructorPortal ? (
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-card p-2">
            {(
              [
                ["modules", "New Module", sortedModules.length],
                ["instructors", "Instructors", assignedInstructors.length],
                ["learners", "Learners", course?.enrolledCount ?? learnerTotal],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}{" "}
                <span className="ml-2 rounded-full bg-background/20 px-2 py-0.5 text-xs">
                  {count}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {!isInstructorPortal && activeTab === "instructors" && (
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-card-foreground">
                  Assigned Instructors
                </h2>
                <p className="text-sm text-muted-foreground">
                  Map instructors directly from this course page.
                </p>
              </div>
              <UserRoundPlus className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Total Assigned
                  </p>
                  <p className="mt-2 text-2xl font-bold text-card-foreground">
                    {assignedInstructors.length}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Active Instructors
                  </p>
                  <p className="mt-2 text-2xl font-bold text-card-foreground">
                    {activeAssignedCount}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Available To Assign
                  </p>
                  <p className="mt-2 text-2xl font-bold text-card-foreground">
                    {unassignedInstructors.length}
                  </p>
                </div>
              </div>

              {assignedInstructors.length ? (
                assignedInstructors.map((instructor) => {
                  const enrollmentId = instructor.enrollments.find(
                    (enrollment) => enrollment.courseId === courseId,
                  )?.enrollmentId;

                  return (
                    <div
                      key={instructor.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
                    >
                      <div>
                        <p className="font-semibold text-card-foreground">
                          {instructor.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {instructor.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/instructors/${instructor.id}`}
                          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                        >
                          Open
                        </Link>
                        {enrollmentId ? (
                          <button
                            type="button"
                            disabled={removingInstructorId === instructor.id}
                            onClick={() =>
                              void handleRemoveInstructor(instructor)
                            }
                            className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-destructive hover:bg-muted disabled:opacity-60"
                          >
                            {removingInstructorId === instructor.id
                              ? "Removing..."
                              : "Remove"}
                          </button>
                        ) : (
                          <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                            Via class
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No instructor assigned yet.
                </div>
              )}
            </div>

            {canEdit ? (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <label className="relative block max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={instructorQuery}
                    onChange={(event) => setInstructorQuery(event.target.value)}
                    placeholder="Search instructor by name or email"
                    className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedInstructorId}
                    onChange={(event) =>
                      setSelectedInstructorId(event.target.value)
                    }
                    className="min-w-[320px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select instructor...</option>
                    {filteredUnassignedInstructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.name} ({instructor.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedInstructorId || assigningInstructor}
                    onClick={() => void handleAssignInstructor()}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {assigningInstructor ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Assign instructor
                  </button>
                </div>

                {instructorQuery.trim() &&
                filteredUnassignedInstructors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No available instructor matched your search.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        )}

        {!isInstructorPortal && activeTab === "learners" ? (
          <section className="space-y-5 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-card-foreground">
                  Course Learners
                </h2>
                <p className="text-sm text-muted-foreground">
                  Search, filter, enroll, update, or remove learners from this
                  course.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                {learnerTotal} learners
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_220px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={learnerSearch}
                  onChange={(event) => {
                    setLearnerSearch(event.target.value);
                    setLearnerPage(1);
                  }}
                  placeholder="Search learner name or email"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm"
                />
              </label>
              <select
                value={learnerStatus}
                onChange={(event) => {
                  setLearnerStatus(event.target.value);
                  setLearnerPage(1);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">All statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
              <select
                value={learnerBatchId}
                onChange={(event) => {
                  setLearnerBatchId(event.target.value);
                  setLearnerPage(1);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">All batches / cohorts</option>
                {learnerBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.code})
                  </option>
                ))}
              </select>
            </div>

            {can("STUDENTS", "edit") && canEdit ? (
              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                <div
                  className="flex flex-wrap gap-2"
                  aria-label="Enrollment mode"
                >
                  {(
                    [
                      ["individual", "Individual learner"],
                      ["batch", "Whole batch / cohort"],
                      ["all", "All eligible learners"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={enrollMode === mode}
                      disabled={learnerMutationId !== null}
                      onClick={() => setEnrollMode(mode)}
                      className={`rounded-lg border px-3 py-2 text-sm ${enrollMode === mode ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {enrollMode === "individual" ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Select an active learner to enroll. Showing up to 20
                      matches; search to find more.
                    </p>
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,1fr)_auto]">
                      <input
                        value={candidateSearch}
                        onChange={(event) =>
                          setCandidateSearch(event.target.value)
                        }
                        placeholder="Find a learner to enroll by name or email"
                        className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                      />
                      <select
                        value={selectedLearnerId}
                        onChange={(event) =>
                          setSelectedLearnerId(event.target.value)
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                      >
                        <option value="">Select learner...</option>
                        {learnerCandidates.map((learner) => (
                          <option key={learner.id} value={learner.id}>
                            {learner.name} ({learner.email})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={
                          !selectedLearnerId || learnerMutationId !== null
                        }
                        onClick={() => void handleAssignLearner()}
                        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Enroll learner
                      </button>
                    </div>
                    {!learnerLoading && learnerCandidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No eligible learners match. Already enrolled learners
                        are excluded.
                      </p>
                    ) : null}
                  </>
                ) : enrollMode === "batch" ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Assign the course to an active batch / cohort, including
                      its current and future members. Other course assignments
                      remain unchanged.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <select
                        aria-label="Batch or cohort to assign"
                        value={enrollBatchId}
                        onChange={(event) =>
                          setEnrollBatchId(event.target.value)
                        }
                        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                      >
                        <option value="">Select batch / cohort...</option>
                        {availableBatches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.name} ({batch.code}) —{" "}
                            {batch._count.memberships} members
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!enrollBatchId || learnerMutationId !== null}
                        onClick={() => void handleBulkEnrollment()}
                        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {learnerMutationId === "bulk"
                          ? "Enrolling…"
                          : "Enroll batch"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Enroll all {eligibleCount} active/approved learners who
                      have no enrollment in this course, across all batches.
                      Table filters do not limit this action. Existing
                      enrollments are unchanged.
                    </p>
                    <button
                      type="button"
                      disabled={
                        eligibleCount === 0 ||
                        learnerMutationId !== null ||
                        learnerLoading
                      }
                      onClick={() => void handleBulkEnrollment()}
                      className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {learnerMutationId === "bulk"
                        ? "Enrolling…"
                        : `Enroll all ${eligibleCount} learners`}
                    </button>
                  </>
                )}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[850px]">
                <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Learner</th>
                    <th className="px-4 py-3">Batch / Cohort</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Enrolled</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {learnerLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                      >
                        Loading learners...
                      </td>
                    </tr>
                  ) : learners.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                      >
                        No learners match these filters.
                      </td>
                    </tr>
                  ) : (
                    learners.map((learner) => (
                      <tr key={learner.enrollmentId}>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{learner.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {learner.email}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {learner.batches.length ? (
                            learner.batches
                              .map((batch) => batch.name)
                              .join(", ")
                          ) : (
                            <span className="text-muted-foreground">
                              Direct enrollment
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                            {learner.enrollmentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${Math.min(100, learner.progress)}%`,
                                }}
                              />
                            </div>
                            {learner.progress}%
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(learner.enrolledAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Link
                              href={`/admin/users/${learner.id}`}
                              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                            >
                              Open / Edit
                            </Link>
                            {canEdit ? (
                              <button
                                type="button"
                                disabled={learnerMutationId === learner.id}
                                onClick={() =>
                                  void handleRemoveLearner(learner)
                                }
                                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-destructive hover:bg-muted disabled:opacity-50"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {learnerPage} of{" "}
                {Math.max(1, Math.ceil(learnerTotal / 25))}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={learnerPage === 1 || learnerLoading}
                  onClick={() =>
                    setLearnerPage((page) => Math.max(1, page - 1))
                  }
                  className="rounded-lg border border-border px-3 py-2 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={learnerPage * 25 >= learnerTotal || learnerLoading}
                  onClick={() => setLearnerPage((page) => page + 1)}
                  className="rounded-lg border border-border px-3 py-2 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "modules" &&
          (loading ? (
            <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card">
              <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sortedModules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No modules have been created for this course yet.
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedModules.map((module) => (
                <div
                  key={module.id}
                  className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="relative aspect-video w-full bg-muted">
                    <Image
                      src={module.coverImage || "/assets/module_image.jpg"}
                      alt={module.title}
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => setPreviewModule(module)}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md">
                        <Play className="h-5 w-5 fill-black text-black" />
                      </div>
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {t("modulesPage.moduleOrder", { order: module.order })}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-card-foreground">
                      {module.title}
                    </h2>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">
                      {module.overview || t("modulesPage.noOverview")}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {module.durationMinutes} min
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        {module.resources.length} resources
                      </span>
                      <span>{prettyEnum(module.type)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                      <Link
                        href={`${coursesPath}/${course?.id}/modules/${module.id}`}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        {t("modulesPage.openModule")}
                      </Link>
                      {canEdit && (
                        <button
                          onClick={() => openEditModule(module)}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          {t("actions.edit")}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(module)}
                          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-muted"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("actions.delete")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/70">
                  <tr>
                    {[
                      t("modulesPage.table.order"),
                      t("modulesPage.table.title"),
                      t("modulesPage.table.duration"),
                      t("modulesPage.table.quiz"),
                      t("modulesPage.table.actions"),
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedModules.map((module) => (
                    <tr key={module.id}>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {module.order}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-card-foreground">
                        {module.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {module.durationMinutes} min
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {module.hasQuiz
                          ? t("modulesPage.quizYes")
                          : t("modulesPage.quizNo")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`${coursesPath}/${course?.id}/modules/${module.id}`}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                          >
                            {t("modulesPage.openModule")}
                          </Link>
                          {canEdit && (
                            <button
                              onClick={() => openEditModule(module)}
                              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                            >
                              {t("actions.edit")}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(module)}
                              className="rounded-lg border border-border p-1.5 text-destructive hover:bg-muted"
                              aria-label={t("actions.delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {(canCreate || canEdit) && isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-card-foreground">
                  {draft.title || t("modulesPage.newModule")}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleSaveModule()}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {saving ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t("editor.save")}
                  </button>
                  <button
                    onClick={() => setIsEditorOpen(false)}
                    aria-label={t("editor.close")}
                    className="rounded-lg border border-border p-2 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    <Image
                      src={draft.coverImage || "/assets/module_image.jpg"}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                  <label className="flex-1 cursor-pointer rounded-lg border border-border px-3 py-2.5 text-center text-sm font-semibold hover:bg-muted">
                    <span className="inline-flex items-center gap-2">
                      {uploading ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {t("modulesPage.fields.coverImage")}
                    </span>
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

                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-xs text-muted-foreground">
                    {draft.videoUrl || draft.youtubeVideoId ? (
                      <Play className="h-5 w-5" />
                    ) : (
                      "No video"
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer rounded-lg border border-border px-3 py-2.5 text-center text-sm font-semibold hover:bg-muted">
                    <span className="inline-flex items-center gap-2">
                      {uploadingVideo ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {t.has("modulesPage.fields.video")
                        ? t("modulesPage.fields.video")
                        : "Upload video"}
                    </span>
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

                <div>
                  <input
                    value={draft.youtubeUrl ?? ""}
                    onChange={(event) =>
                      handleYoutubeUrlChange(event.target.value)
                    }
                    placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Or paste an Unlisted YouTube URL instead of uploading a
                    file.
                  </p>
                  {showYoutubeError && (
                    <p className="mt-1.5 text-xs font-medium text-destructive">
                      Please enter a valid YouTube video URL.
                    </p>
                  )}
                  {previewVideoId && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                        Live Preview
                      </p>
                      <YouTubePlayer videoId={previewVideoId} />
                    </div>
                  )}
                </div>

                <div>
                  <input
                    autoFocus
                    value={draft.title}
                    onChange={(event) => {
                      setDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }));
                      if (titleError) setTitleError("");
                    }}
                    placeholder={t("modulesPage.fields.title")}
                    aria-invalid={Boolean(titleError)}
                    aria-describedby={
                      titleError ? "module-title-error" : undefined
                    }
                    className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm ${
                      titleError ? "border-destructive" : "border-border"
                    }`}
                  />
                  {titleError && (
                    <p
                      id="module-title-error"
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-destructive"
                    >
                      {titleError}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={1}
                    value={draft.order}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        order: Number(event.target.value || 1),
                      }))
                    }
                    placeholder={t("modulesPage.fields.order")}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    value={draft.durationMinutes}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        durationMinutes: Number(event.target.value || 0),
                      }))
                    }
                    placeholder="Duration in minutes"
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>

                <select
                  value={draft.type}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      type: event.target.value as ModuleTypeValue,
                    }))
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {moduleTypes.map((type) => (
                    <option key={type} value={type}>
                      {prettyEnum(type)}
                    </option>
                  ))}
                </select>

                <textarea
                  value={draft.overview ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      overview: event.target.value,
                    }))
                  }
                  placeholder={t("modulesPage.fields.overview")}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />

                <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                  {t("modulesPage.fields.hasQuiz")}
                  <input
                    type="checkbox"
                    checked={draft.hasQuiz}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        hasQuiz: event.target.checked,
                        quiz: event.target.checked
                          ? (current.quiz ?? {
                              passingScore: 70,
                              questions: [],
                            })
                          : null,
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {previewModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-3xl rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-card-foreground">
                    {previewModule.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {previewModule.youtubeUrl ||
                      previewModule.videoUrl ||
                      "No video attached yet."}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewModule(null)}
                  className="rounded-lg border border-border p-2 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {previewModule.youtubeVideoId ? (
                <div className="mt-4">
                  <YouTubePlayer videoId={previewModule.youtubeVideoId} />
                </div>
              ) : previewModule.videoUrl ? (
                <video
                  src={previewModule.videoUrl}
                  controls
                  className="mt-4 aspect-video w-full rounded-lg bg-black"
                />
              ) : (
                <div className="mt-4 flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted text-sm text-muted-foreground">
                  No uploaded video preview available.
                </div>
              )}
            </div>
          </div>
        )}

        {canDelete && deleteTarget && (
          <StudentConfirmModal
            title={t("confirm.deleteTitle")}
            description={t("confirm.deleteDescription", {
              title: deleteTarget.title,
            })}
            confirmLabel={t("confirm.deleteConfirm")}
            cancelLabel={t("confirm.cancel")}
            danger
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => void handleDeleteModule()}
          />
        )}
      </div>
    </AdminLayout>
  );
}
