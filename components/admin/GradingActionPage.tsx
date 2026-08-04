"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import WrittenQuestionContent from "@/components/assessment/written-question-content";
import { parseApiJson } from "@/lib/parse-api-json";
import type {
  CheckerReviewPayload,
  GradingQueueFilter,
  GradingQueueItem,
  GradingSubmissionDetail,
  MakerReviewPayload,
} from "@/lib/submission-grading-types";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileText,
  LoaderCircle,
  RotateCcw,
  Send,
} from "lucide-react";

type GradeDraft = Record<string, { marks: string; comment: string }>;

const queueOptions: Array<{
  value: GradingQueueFilter;
  label: string;
  description: string;
}> = [
  {
    value: "maker",
    label: "Maker Queue",
    description: "New, draft, and returned submissions waiting for first marking.",
  },
  {
    value: "checker",
    label: "Checker Queue",
    description: "Maker-reviewed submissions waiting for final approval.",
  },
  {
    value: "returned",
    label: "Returned",
    description: "Returned to maker with checker feedback.",
  },
  {
    value: "finalized",
    label: "Finalized",
    description: "Approved submissions with final learner-facing marks.",
  },
  {
    value: "all",
    label: "All Manual",
    description: "Every WRITTEN / PRACTICAL submission in manual grading.",
  },
];

function statusBadge(status: string) {
  switch (status) {
    case "PENDING_MAKER":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "MAKER_DRAFT":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "PENDING_CHECKER":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "RETURNED_TO_MAKER":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "FINALIZED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function humanizeStatus(status: string) {
  switch (status) {
    case "PENDING_MAKER":
      return "Pending Maker";
    case "MAKER_DRAFT":
      return "Maker Draft";
    case "PENDING_CHECKER":
      return "Pending Checker";
    case "RETURNED_TO_MAKER":
      return "Returned";
    case "FINALIZED":
      return "Finalized";
    default:
      return status;
  }
}

function parseIso(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function totalFromDraft(grades: GradeDraft) {
  return Object.values(grades).reduce((sum, item) => {
    const marks = Number(item.marks);
    return sum + (Number.isFinite(marks) ? marks : 0);
  }, 0);
}

export default function GradingActionPage() {
  const searchParams = useSearchParams();
  const { can } = useAdminPermissions();
  const canEdit = can("GRADING", "edit");
  const queueParam = searchParams.get("queue");
  const submissionIdParam = searchParams.get("submissionId");
  const initialQueue = isQueueFilter(queueParam) ? queueParam : "maker";
  const [queue, setQueue] = useState<GradingQueueFilter>(initialQueue);
  const [submissions, setSubmissions] = useState<GradingQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(submissionIdParam);
  const [selected, setSelected] = useState<GradingSubmissionDetail | null>(null);
  const [gradeDraft, setGradeDraft] = useState<GradeDraft>({});
  const [overallMarks, setOverallMarks] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedQueueMeta = queueOptions.find((option) => option.value === queue);

  async function loadQueue(nextQueue = queue) {
    setLoadingQueue(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/grading?queue=${nextQueue}`, {
        cache: "no-store",
      });
      const result = await parseApiJson<{ submissions?: GradingQueueItem[]; error?: string }>(
        response,
      );
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load grading queue.");
      }
      const nextItems = result.submissions ?? [];
      setSubmissions(nextItems);
      setSelectedId((current) => {
        if (current && nextItems.some((item) => item.id === current)) {
          return current;
        }
        return nextItems[0]?.id ?? null;
      });
    } catch (caught) {
      setSubmissions([]);
      setSelectedId(null);
      setSelected(null);
      setError(caught instanceof Error ? caught.message : "Failed to load grading queue.");
    } finally {
      setLoadingQueue(false);
    }
  }

  async function loadDetail(id: string) {
    setLoadingDetail(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/grading/${id}`, {
        cache: "no-store",
      });
      const result = await parseApiJson<{ submission?: GradingSubmissionDetail; error?: string }>(
        response,
      );
      if (!response.ok || !result.submission) {
        throw new Error(result.error ?? "Failed to load submission detail.");
      }
      setSelected(result.submission);
      setNotice(null);
    } catch (caught) {
      setSelected(null);
      setError(caught instanceof Error ? caught.message : "Failed to load submission detail.");
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    void loadQueue(queue);
  }, [queue]);

  useEffect(() => {
    if (isQueueFilter(queueParam) && queueParam !== queue) {
      setQueue(queueParam);
    }
  }, [queue, queueParam]);

  useEffect(() => {
    if (submissionIdParam && submissionIdParam !== selectedId) {
      setSelectedId(submissionIdParam);
    }
  }, [selectedId, submissionIdParam]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selected) {
      setGradeDraft({});
      setOverallMarks("");
      setReviewComment("");
      return;
    }

    const isCheckerStage = selected.manualReviewStatus === "PENDING_CHECKER";
    const nextDraft = Object.fromEntries(
      selected.questions.map((question) => [
        question.questionId,
        {
          marks:
            isCheckerStage
              ? String(question.checkerMarks ?? question.makerMarks ?? "")
              : String(question.makerMarks ?? ""),
          comment:
            isCheckerStage
              ? (question.checkerComment ?? question.makerComment ?? "")
              : (question.makerComment ?? ""),
        },
      ]),
    );

    setGradeDraft(nextDraft);
    setOverallMarks(
      String(
        isCheckerStage
          ? selected.checkerTotalMarks ?? selected.makerTotalMarks ?? ""
          : selected.makerTotalMarks ?? "",
      ),
    );
    setReviewComment(
      isCheckerStage
        ? selected.checkerComment ?? ""
        : selected.makerComment ?? "",
    );
  }, [selected]);

  const stage = useMemo(() => {
    if (!selected) return "view";
    if (
      selected.manualReviewStatus === "PENDING_MAKER" ||
      selected.manualReviewStatus === "MAKER_DRAFT" ||
      selected.manualReviewStatus === "RETURNED_TO_MAKER"
    ) {
      return "maker";
    }
    if (selected.manualReviewStatus === "PENDING_CHECKER") {
      return "checker";
    }
    return "view";
  }, [selected]);

  async function submitMaker(action: MakerReviewPayload["action"]) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const payload: MakerReviewPayload = {
        action,
        overallMarks: overallMarks ? Number(overallMarks) : null,
        comment: reviewComment,
        grades: selected.questions.map((question) => ({
          questionId: question.questionId,
          marks: gradeDraft[question.questionId]?.marks
            ? Number(gradeDraft[question.questionId].marks)
            : null,
          comment: gradeDraft[question.questionId]?.comment ?? "",
        })),
      };
      const response = await fetch(`/api/admin/grading/${selected.id}/maker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await parseApiJson<{ submission?: GradingSubmissionDetail; error?: string }>(
        response,
      );
      if (!response.ok || !result.submission) {
        throw new Error(result.error ?? "Failed to save maker review.");
      }
      setSelected(result.submission);
      setNotice(
        action === "submit-for-checker"
          ? "Submitted to checker."
          : "Maker draft saved.",
      );
      await loadQueue(queue);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save maker review.");
    } finally {
      setSaving(false);
    }
  }

  async function submitChecker(action: CheckerReviewPayload["action"]) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const payload: CheckerReviewPayload = {
        action,
        overallMarks: overallMarks ? Number(overallMarks) : null,
        comment: reviewComment,
        grades: selected.questions.map((question) => ({
          questionId: question.questionId,
          marks: gradeDraft[question.questionId]?.marks
            ? Number(gradeDraft[question.questionId].marks)
            : null,
          comment: gradeDraft[question.questionId]?.comment ?? "",
        })),
      };
      const response = await fetch(`/api/admin/grading/${selected.id}/checker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await parseApiJson<{ submission?: GradingSubmissionDetail; error?: string }>(
        response,
      );
      if (!response.ok || !result.submission) {
        throw new Error(result.error ?? "Failed to apply checker review.");
      }
      setSelected(result.submission);
      setNotice(
        action === "approve"
          ? "Submission approved and final marks published."
          : "Submission returned to maker.",
      );
      await loadQueue(queue);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to apply checker review.");
    } finally {
      setSaving(false);
    }
  }

  const attachmentCount = selected?.answerPayload?.attachments?.length ?? 0;
  const isQuestionlessAssessment = selected?.questions.length === 0;

  return (
    <AdminLayout title="Grading">
      <div className="min-w-0 space-y-6 p-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-card-foreground">
            Manual Grading
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Maker-checker workflow for WRITTEN and PRACTICAL submissions.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-5">
          {queueOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setQueue(option.value)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                queue === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <p className="text-sm font-semibold text-card-foreground">
                {option.label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {option.description}
              </p>
            </button>
          ))}
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-card-foreground">
                {selectedQueueMeta?.label ?? "Queue"}
              </p>
              <p className="text-xs text-muted-foreground">
                {loadingQueue
                  ? "Loading submissions..."
                  : `${submissions.length} item(s) in this queue.`}
              </p>
            </div>

            {loadingQueue ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Loading queue...
              </div>
            ) : submissions.length === 0 ? (
              <div className="min-h-64 p-6 text-sm text-muted-foreground">
                No submissions in this queue.
              </div>
            ) : (
              <div className="max-h-[72vh] overflow-y-auto">
                {submissions.map((submission) => (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => setSelectedId(submission.id)}
                    className={`w-full border-b border-border px-5 py-4 text-left transition-colors hover:bg-muted/40 ${
                      selectedId === submission.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">
                          {submission.learnerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {submission.assessmentTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {submission.courseTitle}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadge(
                          submission.manualReviewStatus,
                        )}`}
                      >
                        {humanizeStatus(submission.manualReviewStatus)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{submission.assessmentType}</span>
                      <span>{parseIso(submission.submittedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {!selectedId ? (
              <div className="flex min-h-[72vh] items-center justify-center p-6 text-sm text-muted-foreground">
                Select a submission to start grading.
              </div>
            ) : loadingDetail ? (
              <div className="flex min-h-[72vh] items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Loading submission...
              </div>
            ) : !selected ? (
              <div className="flex min-h-[72vh] items-center justify-center p-6 text-sm text-muted-foreground">
                {error ?? "Submission detail is unavailable."}
              </div>
            ) : (
              <div className="min-w-0 space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-card-foreground">
                        {selected.learnerName}
                      </h2>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge(
                          selected.manualReviewStatus,
                        )}`}
                      >
                        {humanizeStatus(selected.manualReviewStatus)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.assessmentTitle} · {selected.assessmentType}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selected.courseTitle}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Submitted: {parseIso(selected.submittedAt)}</p>
                    <p>Maker: {selected.makerName ?? "—"}</p>
                    <p>Checker: {selected.checkerName ?? "—"}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <MetricCard
                    label="Total Marks"
                    value={String(selected.totalMarks)}
                  />
                  <MetricCard
                    label="Current Draft"
                    value={String(
                      isQuestionlessAssessment
                        ? overallMarks || selected.makerTotalMarks || "0"
                        : totalFromDraft(gradeDraft),
                    )}
                  />
                  <MetricCard
                    label="Final Marks"
                    value={selected.obtainedMarks?.toString() ?? "Pending"}
                  />
                  <MetricCard
                    label="Attachments"
                    value={String(attachmentCount)}
                  />
                </div>

                {selected.returnReason ? (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-semibold">Checker feedback</p>
                    <p className="mt-1">{selected.returnReason}</p>
                  </div>
                ) : null}

                {selected.answerPayload ? (
                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-card-foreground">
                      Learner Submission
                    </h3>

                    {selected.answerPayload.notes ? (
                      <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                        <p className="font-semibold text-card-foreground">
                          Notes
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground [overflow-wrap:anywhere]">
                          {selected.answerPayload.notes}
                        </p>
                      </div>
                    ) : null}

                    {attachmentCount > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-card-foreground">
                          Attachments
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                          {selected.answerPayload.attachments?.map((attachment, index) => (
                            <div
                              key={`${selected.id}-attachment-${index}`}
                              className="overflow-hidden rounded-2xl border border-border bg-background"
                            >
                              {attachment.startsWith("data:image") ? (
                                <img
                                  src={attachment}
                                  alt={`Submission attachment ${index + 1}`}
                                  className="h-auto w-full object-contain"
                                />
                              ) : (
                                <div className="flex min-h-32 items-center justify-center p-4 text-sm text-muted-foreground">
                                  Attachment {index + 1}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-card-foreground">
                      {stage === "checker" ? "Checker Review" : "Maker Review"}
                    </h3>
                    {selected.questions.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Grade each question before continuing.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        This submission has no explicit question rows; use overall marks.
                      </p>
                    )}
                  </div>

                  {selected.questions.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                      <label className="block text-sm font-semibold text-card-foreground">
                        Overall Marks
                      </label>
                      <input
                        value={overallMarks}
                        onChange={(event) => setOverallMarks(event.target.value)}
                        disabled={!canEdit || stage === "view" || saving}
                        className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        placeholder={`0 - ${selected.totalMarks}`}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selected.questions.map((question, index) => (
                        <article
                          key={question.questionId}
                          className="min-w-0 overflow-hidden rounded-2xl border border-border bg-muted/20 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-card-foreground">
                                <span className="text-sm font-semibold">
                                  Q{index + 1}.
                                </span>
                                {question.type === "WRITTEN" ? (
                                  <WrittenQuestionContent
                                    prompt={question.prompt}
                                    options={question.options}
                                    className="mt-1 text-card-foreground"
                                  />
                                ) : (
                                  <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold [overflow-wrap:anywhere]">
                                    {question.prompt}
                                  </p>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {question.type} · Max {question.maxMarks} mark(s)
                              </p>
                            </div>
                            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                              Learner answer
                            </span>
                          </div>

                          <div className="mt-4 max-w-full whitespace-pre-wrap break-words rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                            {question.learnerAnswer ||
                              selected.answerPayload?.notes ||
                              (attachmentCount > 0
                                ? `${attachmentCount} attachment(s) uploaded.`
                                : "No inline answer text was submitted.")}
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
                            <input
                              value={gradeDraft[question.questionId]?.marks ?? ""}
                              onChange={(event) =>
                                setGradeDraft((current) => ({
                                  ...current,
                                  [question.questionId]: {
                                    marks: event.target.value,
                                    comment:
                                      current[question.questionId]?.comment ?? "",
                                  },
                                }))
                              }
                              disabled={!canEdit || stage === "view" || saving}
                              className="min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                              placeholder={`0-${question.maxMarks}`}
                            />
                            <textarea
                              value={gradeDraft[question.questionId]?.comment ?? ""}
                              onChange={(event) =>
                                setGradeDraft((current) => ({
                                  ...current,
                                  [question.questionId]: {
                                    marks:
                                      current[question.questionId]?.marks ?? "",
                                    comment: event.target.value,
                                  },
                                }))
                              }
                              disabled={!canEdit || stage === "view" || saving}
                              rows={2}
                              className="min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                              placeholder="Question-level feedback"
                            />
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <label className="block text-sm font-semibold text-card-foreground">
                      {stage === "checker" ? "Checker Note" : "Maker Note"}
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      disabled={!canEdit || stage === "view" || saving}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      placeholder={
                        stage === "checker"
                          ? "Explain approval or return changes."
                          : "Leave guidance for the checker."
                      }
                    />
                  </div>

                  {error ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  ) : null}

                  {notice ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      {notice}
                    </div>
                  ) : null}

                  {canEdit && stage === "maker" ? (
                    <div className="flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => void submitMaker("save-draft")}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitMaker("submit-for-checker")}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {saving ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Submit for Checker
                      </button>
                    </div>
                  ) : null}

                  {canEdit && stage === "checker" ? (
                    <div className="flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => void submitChecker("return-to-maker")}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Return to Maker
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitChecker("approve")}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {saving ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        Approve Final Marks
                      </button>
                    </div>
                  ) : null}
                </section>
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function isQueueFilter(value: string | null): value is GradingQueueFilter {
  return (
    value === "maker" ||
    value === "checker" ||
    value === "returned" ||
    value === "finalized" ||
    value === "all"
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-card-foreground">
        {value}
      </p>
    </div>
  );
}
