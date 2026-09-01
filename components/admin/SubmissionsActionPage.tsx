"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import WrittenQuestionContent from "@/components/assessment/written-question-content";
import { parseApiJson } from "@/lib/parse-api-json";
import type {
  GradingQueueItem,
  GradingSubmissionDetail,
  ManualReviewStatusValue,
  SubmissionInboxListResult,
  SubmissionInboxStats,
} from "@/lib/submission-grading-types";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  FlaskConical,
  LoaderCircle,
  Search,
} from "lucide-react";

const PAGE_SIZE = 25;
const EARLIEST_YEAR = 2015;

type StatusTab = "all" | ManualReviewStatusValue;

const statusTabs: StatusTab[] = [
  "all",
  "PENDING_MAKER",
  "MAKER_DRAFT",
  "PENDING_CHECKER",
  "RETURNED_TO_MAKER",
  "FINALIZED",
];

function yearOptions() {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear + 1; year >= EARLIEST_YEAR; year -= 1) {
    years.push(year);
  }
  return years;
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
      return "Returned to Maker";
    case "FINALIZED":
      return "Finalized";
    default:
      return status;
  }
}

function statusClass(status: string) {
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

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeIcon(type: string) {
  return type === "PRACTICAL" ? (
    <FlaskConical className="h-4 w-4" />
  ) : (
    <FileText className="h-4 w-4" />
  );
}

function submissionSource(detail: GradingSubmissionDetail | null) {
  if (!detail?.answerPayload) return "Unknown";
  if (detail.assessmentType === "PRACTICAL") return "Practical";
  if (detail.answerPayload.attachments?.length) return "Scanned";
  return "Written";
}

export default function SubmissionsActionPage() {
  const [rows, setRows] = useState<GradingQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [stats, setStats] = useState<SubmissionInboxStats>({
    all: 0,
    pendingMaker: 0,
    makerDraft: 0,
    pendingChecker: 0,
    returnedToMaker: 0,
    finalized: 0,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<GradingSubmissionDetail | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusTab>("all");
  const [courseId, setCourseId] = useState("all");
  const [year, setYear] = useState<"all" | string>("all");
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setQuery(queryInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [queryInput]);

  useEffect(() => {
    setPage(1);
  }, [query, status, courseId, year]);

  const isFirstLoad = useRef(true);
  const loadRows = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const includeStats = isFirstLoad.current;
      const includeCourseOptions = isFirstLoad.current;
      isFirstLoad.current = false;

      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (courseId !== "all") params.set("courseId", courseId);
      if (status !== "all") params.set("status", status);
      if (year !== "all") {
        params.set("dateFrom", new Date(Date.UTC(Number(year), 0, 1)).toISOString());
        params.set("dateTo", new Date(Date.UTC(Number(year) + 1, 0, 1)).toISOString());
      }
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (includeStats) params.set("includeStats", "true");
      if (includeCourseOptions) params.set("includeCourseOptions", "true");

      const response = await fetch(`/api/admin/submissions?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await parseApiJson<
        SubmissionInboxListResult & {
          stats?: SubmissionInboxStats;
          courses?: Array<{ id: string; title: string }>;
          error?: string;
        }
      >(response);
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load submissions.");
      }
      const items = result.submissions ?? [];
      setRows(items);
      setTotal(result.total ?? 0);
      if (result.stats) setStats(result.stats);
      if (result.courses) setCourses(result.courses);
      setSelectedId((current) =>
        current && items.some((item) => item.id === current)
          ? current
          : (items[0]?.id ?? null),
      );
    } catch (caught) {
      setRows([]);
      setSelectedId(null);
      setSelected(null);
      setError(caught instanceof Error ? caught.message : "Failed to load submissions.");
    } finally {
      setLoadingList(false);
    }
  }, [query, courseId, status, year, page]);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/admin/submissions?page=1&pageSize=1&includeStats=true",
        { cache: "no-store" },
      );
      const result = await parseApiJson<{ stats?: SubmissionInboxStats }>(response);
      if (result.stats) setStats(result.stats);
    } catch {
      // Non-critical — tab counts simply keep their last known values.
    }
  }, []);

  async function loadDetail(id: string) {
    setLoadingDetail(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/submissions/${id}`, {
        cache: "no-store",
      });
      const result = await parseApiJson<{ submission?: GradingSubmissionDetail; error?: string }>(
        response,
      );
      if (!response.ok || !result.submission) {
        throw new Error(result.error ?? "Failed to load submission detail.");
      }
      setSelected(result.submission);
    } catch (caught) {
      setSelected(null);
      setError(caught instanceof Error ? caught.message : "Failed to load submission detail.");
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleRows = rows;

  return (
    <AdminLayout title="Submissions">
      <div className="space-y-6 p-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-card-foreground">
            Submission Inbox
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real WRITTEN and PRACTICAL learner submissions within your permitted scope.
          </p>
        </section>

        <section className="grid gap-3 rounded-2xl border border-border bg-card p-5 md:grid-cols-[minmax(0,1fr)_200px_160px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm"
              placeholder="Search learner or assessment"
            />
          </label>

          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="all">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            aria-label="Year"
          >
            <option value="all">All Years</option>
            {yearOptions().map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              void loadRows();
              void loadStats();
            }}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            Refresh
          </button>
        </section>

        <div className="flex flex-wrap gap-2 border-b border-border pb-1">
          {statusTabs.map((item) => {
            const count =
              item === "all"
                ? stats.all
                : item === "PENDING_MAKER"
                  ? stats.pendingMaker
                  : item === "MAKER_DRAFT"
                    ? stats.makerDraft
                    : item === "PENDING_CHECKER"
                      ? stats.pendingChecker
                      : item === "RETURNED_TO_MAKER"
                        ? stats.returnedToMaker
                        : stats.finalized;
            const isActive = status === item;
            return (
              <button
                key={item}
                onClick={() => setStatus(item)}
                className={`relative flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                {item === "all" ? "All" : humanizeStatus(item)}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {loadingList ? (
              <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Loading submissions...
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="min-h-80 p-6 text-sm text-muted-foreground">
                No submissions matched your filters.
              </div>
            ) : (
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-border bg-muted/70">
                  <tr>
                    {["Learner", "Assessment", "Type", "Status", "Submitted", "Score"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className={`cursor-pointer hover:bg-muted/40 ${
                        selectedId === row.id ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-4 text-sm">
                        <p className="font-semibold text-card-foreground">
                          {row.learnerName}
                        </p>
                        <p className="text-xs text-muted-foreground">{row.id}</p>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <p className="font-medium text-card-foreground">
                          {row.assessmentTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.courseTitle}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1">
                          {typeIcon(row.assessmentType)}
                          {row.assessmentType}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                            row.manualReviewStatus,
                          )}`}
                        >
                          {humanizeStatus(row.manualReviewStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatDate(row.submittedAt)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {row.obtainedMarks !== null
                          ? `${row.obtainedMarks}/${row.totalMarks}`
                          : "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} · {total} submissions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            {loadingDetail ? (
              <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Loading detail...
              </div>
            ) : !selected ? (
              <div className="min-h-80 text-sm text-muted-foreground">
                {error ?? "Select a submission to inspect it."}
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold text-primary">Submission detail</p>
                  <h2 className="text-xl font-bold text-card-foreground">
                    {selected.learnerName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.assessmentTitle}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {submissionSource(selected)} · {selected.courseTitle}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard label="Workflow" value={humanizeStatus(selected.manualReviewStatus)} />
                  <InfoCard
                    label="Current Marks"
                    value={
                      selected.obtainedMarks !== null
                        ? `${selected.obtainedMarks}/${selected.totalMarks}`
                        : "Pending"
                    }
                  />
                  <InfoCard label="Submitted" value={formatDate(selected.submittedAt)} />
                  <InfoCard
                    label="Attachments"
                    value={String(selected.answerPayload?.attachments?.length ?? 0)}
                  />
                  <InfoCard
                    label="Maker"
                    value={selected.makerName ?? "Unassigned"}
                  />
                  <InfoCard
                    label="Checker"
                    value={selected.checkerName ?? "Unassigned"}
                  />
                </div>

                <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm sm:grid-cols-3">
                  <TimelineItem
                    label="Maker marked"
                    value={formatDate(selected.makerMarkedAt)}
                  />
                  <TimelineItem
                    label="Sent to checker"
                    value={formatDate(selected.makerSubmittedAt)}
                  />
                  <TimelineItem
                    label="Checker updated"
                    value={formatDate(selected.checkedAt)}
                  />
                </div>

                {selected.answerPayload?.notes ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                    <p className="font-semibold text-card-foreground">Learner note</p>
                    <p className="mt-1 text-muted-foreground">
                      {selected.answerPayload.notes}
                    </p>
                  </div>
                ) : null}

                {selected.answerPayload?.attachments?.length ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-card-foreground">
                      Uploaded attachments
                    </p>
                    <div className="grid gap-3">
                      {selected.answerPayload.attachments.map((attachment, index) => (
                        <a
                          key={`${selected.id}-${index}`}
                          href={attachment}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-border bg-background p-3 text-sm text-primary break-all"
                        >
                          Attachment {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selected.questions.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-card-foreground">
                      Question review
                    </p>
                    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                      {selected.questions.map((question, index) => (
                        <div
                          key={question.questionId}
                          className="min-w-0 overflow-hidden rounded-xl border border-border bg-muted/20 p-4"
                        >
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
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                            Learner answer:{" "}
                            {question.learnerAnswer ||
                              (selected.answerPayload?.attachments?.length
                                ? "See uploaded attachment"
                                : "No inline answer")}
                          </p>
                          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                            <span>Maker: {question.makerMarks ?? "—"}</span>
                            <span>Checker: {question.checkerMarks ?? "—"}</span>
                            <span>Max: {question.maxMarks}</span>
                          </div>
                          {question.makerComment || question.checkerComment ? (
                            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                              {question.makerComment ? (
                                <p>Maker note: {question.makerComment}</p>
                              ) : null}
                              {question.checkerComment ? (
                                <p>Checker note: {question.checkerComment}</p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(selected.makerComment ||
                  selected.checkerComment ||
                  selected.returnReason) && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-card-foreground">
                      Review feedback
                    </p>
                    {selected.makerComment ? (
                      <FeedbackCard label="Maker comment" body={selected.makerComment} />
                    ) : null}
                    {selected.checkerComment ? (
                      <FeedbackCard label="Checker comment" body={selected.checkerComment} />
                    ) : null}
                    {selected.returnReason ? (
                      <FeedbackCard label="Return reason" body={selected.returnReason} />
                    ) : null}
                  </div>
                )}

                <Link
                  href={`/admin/submissions/${selected.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Submission Details
                </Link>

                {error ? (
                  <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                ) : null}
              </div>
            )}
          </aside>
        </section>
      </div>
    </AdminLayout>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-card-foreground">{value}</p>
    </div>
  );
}

function FeedbackCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
      <p className="font-semibold text-card-foreground">{label}</p>
      <p className="mt-1 text-muted-foreground">{body}</p>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-semibold text-card-foreground">{value}</p>
    </div>
  );
}
