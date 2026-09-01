"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Eye,
  Link2,
  LoaderCircle,
  Mail,
  RefreshCw,
  Send,
  Smartphone,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import type {
  AdminNotificationData,
  CreateNotificationCampaignInput,
  NotificationAudienceValue,
  NotificationTypeValue,
} from "@/lib/admin-notification-types";
import { parseApiJson } from "@/lib/parse-api-json";

const EMPTY_DATA: AdminNotificationData = {
  campaigns: [],
  audiences: {
    allActiveStudents: 0,
    allActiveInstructors: 0,
    courses: [],
    assessments: [],
    instructors: [],
  },
  totals: {
    campaigns: 0,
    delivered: 0,
    read: 0,
    unread: 0,
  },
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function notificationTone(type: NotificationTypeValue) {
  switch (type) {
    case "SUCCESS":
      return "bg-emerald-50 text-emerald-700";
    case "WARNING":
      return "bg-amber-50 text-amber-700";
    case "ERROR":
      return "bg-red-50 text-red-700";
    default:
      return "bg-sky-50 text-sky-700";
  }
}

export default function NotificationsActionPage() {
  const tAdmin = useTranslations("admin");
  const { can } = useAdminPermissions();
  const canSend = can("SETTINGS", "create");
  const [data, setData] = useState<AdminNotificationData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [type, setType] = useState<NotificationTypeValue>("INFO");
  const [audienceType, setAudienceType] = useState<NotificationAudienceValue>(
    "ALL_ACTIVE_STUDENTS",
  );
  const [courseId, setCourseId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [instructorId, setInstructorId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/notifications", {
        cache: "no-store",
      });
      const result = await parseApiJson<
        AdminNotificationData & {
          error?: string;
        }
      >(response);
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load notifications.");
      }
      setData(result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCourse = data.audiences.courses.find(
    (course) => course.id === courseId,
  );
  const selectedAssessment = data.audiences.assessments.find(
    (assessment) => assessment.id === assessmentId,
  );
  const selectedInstructor = data.audiences.instructors.find(
    (instructor) => instructor.id === instructorId,
  );
  const instructorAudience =
    audienceType === "ALL_ACTIVE_INSTRUCTORS" ||
    audienceType === "COURSE_INSTRUCTORS" ||
    audienceType === "SPECIFIC_INSTRUCTOR";
  const audienceCount =
    audienceType === "COURSE_STUDENTS"
      ? (selectedCourse?.learnerCount ?? 0)
      : audienceType === "ASSESSMENT_PENDING_STUDENTS"
        ? (selectedAssessment?.learnerCount ?? 0)
        : audienceType === "ALL_ACTIVE_INSTRUCTORS"
          ? data.audiences.allActiveInstructors
          : audienceType === "COURSE_INSTRUCTORS"
            ? (selectedCourse?.instructorCount ?? 0)
            : audienceType === "SPECIFIC_INSTRUCTOR"
              ? selectedInstructor
                ? 1
                : 0
              : data.audiences.allActiveStudents;

  async function sendNotification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend || sending) return;

    const payload: CreateNotificationCampaignInput = {
      subject,
      message,
      actionUrl,
      type,
      audienceType,
      courseId:
        audienceType === "COURSE_STUDENTS" ||
        audienceType === "COURSE_INSTRUCTORS"
          ? courseId
          : undefined,
      assessmentId:
        audienceType === "ASSESSMENT_PENDING_STUDENTS"
          ? assessmentId
          : undefined,
      instructorId:
        audienceType === "SPECIFIC_INSTRUCTOR" ? instructorId : undefined,
    };

    setSending(true);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await parseApiJson<{
        campaign?: { recipientCount: number };
        error?: string;
      }>(response);
      if (!response.ok || !result.campaign) {
        throw new Error(result.error ?? "Failed to send notification.");
      }

      toast.success(
        `Notification delivered to ${result.campaign.recipientCount} recipient${
          result.campaign.recipientCount === 1 ? "" : "s"
        }.`,
      );
      setSubject("");
      setMessage("");
      setActionUrl("");
      await load();
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Failed to send notification.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminLayout title={tAdmin("notifications")}>
      <div className="space-y-6 p-4 sm:p-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_42%),hsl(var(--card))] p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                In-App Communication
              </p>
              <h1 className="mt-2 text-2xl font-bold text-card-foreground sm:text-3xl">
                Notification Center
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Send targeted learner or instructor notifications and track
                delivery and read status from one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60 md:self-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          <div className="mt-6 grid gap-3 grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Campaigns",
                value: data.totals.campaigns,
                icon: BellRing,
              },
              {
                label: "Delivered",
                value: data.totals.delivered,
                icon: Users,
              },
              { label: "Read", value: data.totals.read, icon: Eye },
              {
                label: "Unread",
                value: data.totals.unread,
                icon: CheckCircle2,
              },
            ].map((stat) => (
              <article
                key={stat.label}
                className="rounded-xl border border-border/80 bg-background/80 p-4 backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
              </article>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
          <form
            onSubmit={sendNotification}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Compose
              </p>
              <h2 className="mt-1 text-xl font-bold text-card-foreground">
                Send an in-app notification
              </h2>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm font-semibold">
                <span>Audience</span>
                <select
                  value={audienceType}
                  onChange={(event) =>
                    setAudienceType(
                      event.target.value as NotificationAudienceValue,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
                >
                  <option value="ALL_ACTIVE_STUDENTS">
                    All active students
                  </option>
                  <option value="COURSE_STUDENTS">Students by course</option>
                  <option value="ASSESSMENT_PENDING_STUDENTS">
                    Assessment pending students
                  </option>
                  <option value="ALL_ACTIVE_INSTRUCTORS">
                    All active instructors
                  </option>
                  <option value="COURSE_INSTRUCTORS">
                    Instructors by course
                  </option>
                  <option value="SPECIFIC_INSTRUCTOR">
                    Specific instructor
                  </option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold">
                <span>Notification tone</span>
                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as NotificationTypeValue)
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
                >
                  <option value="INFO">Information</option>
                  <option value="SUCCESS">Success</option>
                  <option value="WARNING">Warning</option>
                  <option value="ERROR">Critical</option>
                </select>
              </label>
            </div>

            {(audienceType === "COURSE_STUDENTS" ||
              audienceType === "COURSE_INSTRUCTORS") && (
              <label className="mt-4 block space-y-1.5 text-sm font-semibold">
                <span>Course</span>
                <select
                  required
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
                >
                  <option value="">Select a course</option>
                  {data.audiences.courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.label} (
                      {audienceType === "COURSE_INSTRUCTORS"
                        ? (course.instructorCount ?? 0)
                        : course.learnerCount}
                      )
                    </option>
                  ))}
                </select>
              </label>
            )}

            {audienceType === "ASSESSMENT_PENDING_STUDENTS" && (
              <label className="mt-4 block space-y-1.5 text-sm font-semibold">
                <span>Assessment</span>
                <select
                  required
                  value={assessmentId}
                  onChange={(event) => setAssessmentId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
                >
                  <option value="">Select an assessment</option>
                  {data.audiences.assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.courseTitle} · {assessment.label} (
                      {assessment.learnerCount})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {audienceType === "SPECIFIC_INSTRUCTOR" && (
              <label className="mt-4 block space-y-1.5 text-sm font-semibold">
                <span>Instructor</span>
                <select
                  required
                  value={instructorId}
                  onChange={(event) => setInstructorId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
                >
                  <option value="">Select an instructor</option>
                  {data.audiences.instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.label} ({instructor.email})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <span className="font-bold text-primary">{audienceCount}</span>{" "}
              eligible {instructorAudience ? "instructor" : "learner"}
              {audienceCount === 1 ? "" : "s"} will receive this notification.
            </div>

            <label className="mt-4 block space-y-1.5 text-sm font-semibold">
              <span>Subject</span>
              <input
                required
                maxLength={160}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Example: Course schedule update"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
              />
            </label>

            <label className="mt-4 block space-y-1.5 text-sm font-semibold">
              <span>Message</span>
              <textarea
                required
                maxLength={2000}
                rows={7}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write a concise message for the selected audience."
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
              />
              <span className="block text-right text-xs font-normal text-muted-foreground">
                {message.length}/2000
              </span>
            </label>

            <label className="mt-1 block space-y-1.5 text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <Link2 className="h-4 w-4" />
                Action path
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </span>
              <input
                value={actionUrl}
                onChange={(event) => setActionUrl(event.target.value)}
                placeholder={
                  instructorAudience ? "/instructor/schedule" : "/assessments"
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
              />
              <span className="block text-xs font-normal text-muted-foreground">
                Use an internal {instructorAudience ? "instructor" : "learner"}{" "}
                route. Clicking the notification opens this page.
              </span>
            </label>

            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Delivery is immediate. Scheduling is not enabled yet.
              </p>
              <button
                type="submit"
                disabled={
                  !canSend ||
                  sending ||
                  loading ||
                  audienceCount === 0 ||
                  !subject.trim() ||
                  !message.trim()
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  canSend
                    ? undefined
                    : "You do not have permission to send notifications."
                }
              >
                {sending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? "Sending…" : "Send now"}
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-bold text-card-foreground">
                Delivery channels
              </h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <BellRing className="h-4 w-4 text-primary" />
                    In-App
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">
                    ACTIVE
                  </span>
                </div>
                {[
                  { label: "Email", icon: Mail },
                  { label: "SMS", icon: Smartphone },
                ].map((channel) => (
                  <div
                    key={channel.label}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3 text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      <channel.icon className="h-4 w-4" />
                      {channel.label}
                    </span>
                    <span className="text-[11px] font-bold">NOT CONNECTED</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                External channels and automated trigger rules require separate
                provider and workflow configuration.
              </p>
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-bold text-card-foreground">
                  Campaign history
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Latest 50 real in-app campaigns
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Loading history…
                </div>
              ) : data.campaigns.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <BellRing className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-semibold">
                    No campaigns sent yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your first real in-app campaign will appear here.
                  </p>
                </div>
              ) : (
                <div className="max-h-[680px] divide-y divide-border overflow-y-auto">
                  {data.campaigns.map((campaign) => (
                    <article key={campaign.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-card-foreground">
                            {campaign.subject}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {campaign.message}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${notificationTone(campaign.type)}`}
                        >
                          {campaign.type}
                        </span>
                      </div>
                      <p className="mt-3 text-xs font-medium text-muted-foreground">
                        {campaign.audienceLabel}
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-muted/60 px-2 py-2">
                          <p className="text-sm font-bold">
                            {campaign.recipientCount}
                          </p>
                          <p className="text-[10px] uppercase text-muted-foreground">
                            Delivered
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/60 px-2 py-2">
                          <p className="text-sm font-bold">
                            {campaign.readCount}
                          </p>
                          <p className="text-[10px] uppercase text-muted-foreground">
                            Read
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/60 px-2 py-2">
                          <p className="text-sm font-bold text-primary">
                            {campaign.readRate}%
                          </p>
                          <p className="text-[10px] uppercase text-muted-foreground">
                            Read rate
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span>{formatDateTime(campaign.sentAt)}</span>
                        <span>By {campaign.createdBy}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
