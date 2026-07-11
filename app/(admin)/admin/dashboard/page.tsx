"use client";

import AdminLayout from "@/components/AdminLayout";
import {
  Activity, AlertTriangle, Award, BookOpen, CalendarClock, CheckCircle2,
  ClipboardCheck, ExternalLink, FileText, GraduationCap, LoaderCircle,
  RefreshCw, ShieldAlert, TrendingDown, TrendingUp, UserCheck, Users, Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface DashboardData {
  generatedAt: string;
  executive: { students: number; newStudents: number; studentGrowth: number; publishedCourses: number; instructors: number; activeEnrollments: number; completionRate: number; averageProgress: number; passRate: number; certificatesThisMonth: number; attendanceRate: number };
  operations: { draftCourses: number; pendingSubmissions: number; pendingStudents: number; activeClasses: number; upcomingSessions: number; atRiskStudents: number };
  monthlyTrend: Array<{ label: string; enrollments: number; completions: number; certificates: number }>;
  completionByCategory: Array<{ name: string; value: number; learners: number }>;
  enrollmentStatuses: Array<{ status: string; count: number }>;
  submissionStatuses: Array<{ status: string; count: number }>;
  coursePerformance: Array<{ id: string; title: string; status: string; learners: number; averageProgress: number; completionRate: number; passRate: number }>;
  instructorWorkload: Array<{ id: string; name: string; status: string; classes: number; completed: number; upcoming: number }>;
  atRiskStudents: Array<{ id: string; name: string; lastActive: string | null; course: string; progress: number }>;
  upcomingSchedule: Array<{ id: string; classId: string; title: string; batch: string; instructor: string; start: string; end: string }>;
  activities: Array<{ id: string; action: string; entity: string; actorName: string; createdAt: string }>;
  pending: Array<{ id: string; label: string; count: number; href: string; severity: string }>;
}

const chartColors = ["#dc2626", "#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0891b2"];
const titleCase = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const prettyAction = (value: string) => value.replaceAll(".", " · ").replace(/([a-z])([A-Z])/g, "$1 $2");
const formatDateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function ProgressBar({ value, tone = "bg-primary" }: { value: number; tone?: string }) {
  return <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const body = (await response.json()) as DashboardData | { error?: string };
      if (!response.ok) throw new Error("error" in body ? body.error : "Dashboard request failed.");
      setData(body as DashboardData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load dashboard.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadDashboard(); }, []);

  if (loading && !data) return <AdminLayout title="Dashboard"><div className="flex min-h-[70vh] items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  if (!data) return <AdminLayout title="Dashboard"><div className="m-6 rounded-2xl border border-destructive/30 bg-card p-10 text-center"><p className="text-destructive">{error}</p><button onClick={() => void loadDashboard()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div></AdminLayout>;

  const kpis = [
    { label: "Total learners", value: data.executive.students, detail: `${data.executive.newStudents} joined in 30 days`, icon: Users, href: "/admin/users", delta: data.executive.studentGrowth },
    { label: "Active enrollments", value: data.executive.activeEnrollments, detail: `${data.executive.averageProgress}% average progress`, icon: GraduationCap, href: "/admin/users" },
    { label: "Completion rate", value: `${data.executive.completionRate}%`, detail: "Approved enrollments", icon: CheckCircle2, href: "/admin/reports" },
    { label: "Assessment pass rate", value: `${data.executive.passRate}%`, detail: "Graded submissions", icon: ClipboardCheck, href: "/admin/reports" },
    { label: "Attendance rate", value: `${data.executive.attendanceRate}%`, detail: "Present and late", icon: UserCheck, href: "/admin/classes" },
    { label: "Certificates issued", value: data.executive.certificatesThisMonth, detail: "Current month", icon: Award, href: "/admin/certificates" },
  ];
  const operational = [
    { label: "Published courses", value: data.executive.publishedCourses, icon: BookOpen, href: "/admin/courses", tone: "text-emerald-600 bg-emerald-500/10" },
    { label: "Active instructors", value: data.executive.instructors, icon: UserCheck, href: "/admin/instructors", tone: "text-blue-600 bg-blue-500/10" },
    { label: "Live & scheduled classes", value: data.operations.activeClasses, icon: Video, href: "/admin/classes", tone: "text-purple-600 bg-purple-500/10" },
    { label: "Upcoming sessions", value: data.operations.upcomingSessions, icon: CalendarClock, href: "/admin/classes", tone: "text-cyan-600 bg-cyan-500/10" },
    { label: "Pending reviews", value: data.operations.pendingSubmissions, icon: FileText, href: "/admin/submissions", tone: "text-amber-600 bg-amber-500/10" },
    { label: "At-risk learners", value: data.operations.atRiskStudents, icon: ShieldAlert, href: "/admin/users", tone: "text-red-600 bg-red-500/10" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <main className="space-y-6 p-4 sm:p-6">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-linear-to-r from-primary/15 via-card to-card p-6 shadow-sm">
          <div><p className="text-sm font-semibold text-primary">Executive & operations overview</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Learning performance command center</h1><p className="mt-1 text-sm text-muted-foreground">Growth, outcomes, engagement, delivery health and risks in one decision-ready view.</p></div>
          <div className="flex items-center gap-3"><div className="text-right text-xs text-muted-foreground"><p>Last updated</p><p className="font-medium text-foreground">{formatDateTime(data.generatedAt)}</p></div><button disabled={loading} onClick={() => void loadDashboard()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-muted disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>
        </section>
        {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}

        <section aria-labelledby="strategic-kpis"><div className="mb-3 flex items-end justify-between"><div><h2 id="strategic-kpis" className="text-lg font-bold">Strategic KPIs</h2><p className="text-sm text-muted-foreground">Executive outcomes and 30-day growth context</p></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{kpis.map(({ label, value, detail, icon: Icon, href, delta }) => <Link key={label} href={href} className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"><div className="flex items-center justify-between"><span className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></span>{delta !== undefined && <span className={`inline-flex items-center gap-1 text-xs font-bold ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>{delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{delta >= 0 ? "+" : ""}{delta}%</span>}</div><p className="mt-4 text-2xl font-bold">{value}</p><p className="mt-1 text-xs font-medium">{label}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p></Link>)}</div></section>

        <section aria-labelledby="operations-health"><h2 id="operations-health" className="mb-3 text-lg font-bold">Operational health</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{operational.map(({ label, value, icon: Icon, href, tone }) => <Link key={label} href={href} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40"><span className={`rounded-lg p-2 ${tone}`}><Icon className="h-4 w-4" /></span><div><p className="text-xl font-bold">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div></Link>)}</div></section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="font-bold">Growth and learning outcomes</h2><p className="text-sm text-muted-foreground">Six-month enrollment, completion and certification trend</p><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data.monthlyTrend}><defs><linearGradient id="enrollmentFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Area type="monotone" dataKey="enrollments" name="Enrollments" stroke="#2563eb" fill="url(#enrollmentFill)" /><Line type="monotone" dataKey="completions" name="Completions" stroke="#16a34a" strokeWidth={3} /><Line type="monotone" dataKey="certificates" name="Certificates" stroke="#9333ea" strokeWidth={2} /></ComposedChart></ResponsiveContainer></div></article>
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="font-bold">Category performance</h2><p className="text-sm text-muted-foreground">Average progress weighted by active learners</p><div className="mt-5 h-80">{data.completionByCategory.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.completionByCategory} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} /><YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} /><Tooltip formatter={(value, name) => [name === "value" ? `${value}%` : value, name === "value" ? "Avg progress" : "Learners"]} /><Bar dataKey="value" radius={[0, 6, 6, 0]}>{data.completionByCategory.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Bar></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No category data yet.</div>}</div></article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="font-bold">Course performance portfolio</h2><p className="text-sm text-muted-foreground">Learner volume, progress, completion and assessment success</p></div><Link href="/admin/courses" className="text-sm font-semibold text-primary">All courses →</Link></div><div className="overflow-x-auto"><table className="w-full min-w-190 text-sm"><thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Course</th><th className="px-5 py-3">Learners</th><th className="px-5 py-3">Avg. progress</th><th className="px-5 py-3">Completion</th><th className="px-5 py-3">Pass rate</th></tr></thead><tbody className="divide-y divide-border">{data.coursePerformance.map((course) => <tr key={course.id} className="hover:bg-muted/30"><td className="px-5 py-4"><Link href={`/admin/courses/${course.id}`} className="font-semibold hover:text-primary">{course.title}</Link><p className="text-xs text-muted-foreground">{titleCase(course.status)}</p></td><td className="px-5 py-4 font-semibold">{course.learners}</td><td className="w-44 px-5 py-4"><div className="mb-1 flex justify-between text-xs"><span>Progress</span><span>{course.averageProgress}%</span></div><ProgressBar value={course.averageProgress} /></td><td className="px-5 py-4">{course.completionRate}%</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${course.passRate >= 70 ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>{course.passRate}%</span></td></tr>)}</tbody></table></div></article>
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><h2 className="font-bold">Learners needing intervention</h2></div><p className="mt-1 text-sm text-muted-foreground">Inactive for 14+ days with progress below 40%</p><div className="mt-4 space-y-3">{data.atRiskStudents.length ? data.atRiskStudents.map((student) => <Link key={student.id} href={`/admin/users/${student.id}`} className="block rounded-xl border border-border p-3 hover:border-amber-400"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{student.name}</p><p className="truncate text-xs text-muted-foreground">{student.course}</p></div><span className="text-xs font-bold text-amber-700">{student.progress}%</span></div><div className="mt-2"><ProgressBar value={student.progress} tone="bg-amber-500" /></div><p className="mt-2 text-[11px] text-muted-foreground">Last active: {student.lastActive ? formatDateTime(student.lastActive) : "Never"}</p></Link>) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No learners currently match the risk rule.</p>}</div></article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="font-bold">Instructor delivery workload</h2><p className="text-sm text-muted-foreground">Assigned classes and session delivery</p><div className="mt-4 space-y-3">{data.instructorWorkload.map((item) => <Link key={item.id} href={`/admin/instructors/${item.id}`} className="flex items-center justify-between rounded-xl border border-border p-3 hover:border-primary/40"><div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{item.classes} classes · {item.completed} completed</p></div><span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-700">{item.upcoming} upcoming</span></Link>)}</div></article>
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="font-bold">Upcoming teaching schedule</h2><p className="text-sm text-muted-foreground">Next scheduled live sessions</p><div className="mt-4 space-y-3">{data.upcomingSchedule.length ? data.upcomingSchedule.map((item) => <Link key={item.id} href={`/admin/classes/${item.classId}`} className="flex items-start gap-3 rounded-xl border border-border p-3 hover:border-primary/40"><span className="rounded-lg bg-primary/10 p-2 text-primary"><CalendarClock className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="truncate text-xs text-muted-foreground">{item.instructor} · {item.batch}</p><p className="mt-1 text-xs font-medium text-primary">{formatDateTime(item.start)}</p></div><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></Link>) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No upcoming sessions.</p>}</div></article>
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="font-bold">Workflow distribution</h2><p className="text-sm text-muted-foreground">Enrollment and submission pipeline</p><div className="mt-5 space-y-5"><div><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Enrollments</p><div className="space-y-2">{data.enrollmentStatuses.map((item, index) => <div key={item.status} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />{titleCase(item.status)}</span><strong>{item.count}</strong></div>)}</div></div><div className="border-t border-border pt-4"><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Submissions</p><div className="space-y-2">{data.submissionStatuses.map((item, index) => <div key={item.status} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[(index + 2) % chartColors.length] }} />{titleCase(item.status)}</span><strong>{item.count}</strong></div>)}</div></div></div></article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2 className="font-bold">Recent administrative activity</h2></div><div className="mt-4 divide-y divide-border">{data.activities.length ? data.activities.map((item) => <div key={item.id} className="flex gap-3 py-3 first:pt-0"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0"><p className="text-sm font-medium capitalize">{prettyAction(item.action)}</p><p className="text-xs text-muted-foreground">{item.actorName} · {item.entity} · {formatDateTime(item.createdAt)}</p></div></div>) : <p className="py-8 text-center text-sm text-muted-foreground">No audit activity yet.</p>}</div><Link href="/admin/activity-log" className="mt-3 inline-block text-sm font-semibold text-primary">View complete activity log →</Link></article>
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /><h2 className="font-bold">Management attention queue</h2></div><p className="mt-1 text-sm text-muted-foreground">Prioritized operational actions with direct drill-down</p><div className="mt-4 space-y-3">{data.pending.map((item) => <Link key={item.id} href={item.href} className={`flex items-center justify-between rounded-xl border p-4 transition hover:bg-muted/40 ${item.severity === "high" && item.count ? "border-amber-300 bg-amber-500/5" : "border-border"}`}><div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">Open management workflow</p></div><span className={`rounded-full px-3 py-1 text-sm font-bold ${item.count ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{item.count}</span></Link>)}</div></article>
        </section>
      </main>
    </AdminLayout>
  );
}
