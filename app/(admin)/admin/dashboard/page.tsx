"use client";

import AdminLayout from "@/components/AdminLayout";
import { Activity, AlertCircle, Award, BookOpen, CheckCircle2, FileText, LoaderCircle, RefreshCw, TrendingUp, Users, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DashboardData {
  stats: { students: number; activeCourses: number; pendingSubmissions: number; passRate: number; certificatesThisMonth: number; liveClasses: number };
  weeklyEnrollments: Array<{ week: number; enrollments: number }>;
  newThisWeek: number;
  completionByCategory: Array<{ name: string; value: number }>;
  activities: Array<{ id: string; action: string; entity: string; actorName: string; createdAt: string }>;
  pending: Array<{ id: string; label: string; count: number; href: string }>;
}

const colors = ["#dc2626", "#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0891b2"];

function prettyAction(value: string) {
  return value.replaceAll(".", " · ").replace(/([a-z])([A-Z])/g, "$1 $2");
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDashboard(); }, []);

  if (loading && !data) return <AdminLayout title="Dashboard"><div className="flex min-h-[70vh] items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  if (!data) return <AdminLayout title="Dashboard"><div className="m-6 rounded-2xl border border-destructive/30 bg-card p-10 text-center"><p className="text-destructive">{error}</p><button onClick={() => void loadDashboard()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button></div></AdminLayout>;

  const stats = [
    { label: "Total students", value: data.stats.students, icon: Users, href: "/admin/users" },
    { label: "Published courses", value: data.stats.activeCourses, icon: BookOpen, href: "/admin/courses" },
    { label: "Pending reviews", value: data.stats.pendingSubmissions, icon: FileText, href: "/admin/submissions" },
    { label: "Assessment pass rate", value: `${data.stats.passRate}%`, icon: CheckCircle2, href: "/admin/reports" },
    { label: "Certificates this month", value: data.stats.certificatesThisMonth, icon: Award, href: "/admin/certificates" },
    { label: "Active & scheduled classes", value: data.stats.liveClasses, icon: Video, href: "/admin/classes" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <main className="space-y-6 p-4 sm:p-6">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-gradient-to-r from-primary/15 via-card to-card p-6 shadow-sm">
          <div><p className="text-sm font-semibold text-primary">Live overview</p><h1 className="mt-1 text-2xl font-bold">Admin dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Real-time LMS performance from your database.</p></div>
          <button disabled={loading} onClick={() => void loadDashboard()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-muted disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </section>

        {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {stats.map(({ label, value, icon: Icon, href }) => <Link key={label} href={href} className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"><div className="flex items-center justify-between"><span className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></span><TrendingUp className="h-4 w-4 text-emerald-600" /></div><p className="mt-4 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></Link>)}
        </section>

        <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="font-bold">Weekly enrollment trend</h2><p className="text-sm text-muted-foreground">New enrollments during the last 12 weeks</p></div><span className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">+{data.newThisWeek} this week</span></div><div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.weeklyEnrollments}><defs><linearGradient id="enrollmentFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#dc2626" stopOpacity={0.35} /><stop offset="95%" stopColor="#dc2626" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="week" tickFormatter={(value) => `W${value}`} /><YAxis allowDecimals={false} /><Tooltip /><Area type="monotone" dataKey="enrollments" stroke="#dc2626" strokeWidth={3} fill="url(#enrollmentFill)" /></AreaChart></ResponsiveContainer></div></article>
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="font-bold">Progress by category</h2><p className="text-sm text-muted-foreground">Average approved-enrollment progress</p><div className="mt-5 h-72">{data.completionByCategory.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.completionByCategory} layout="vertical" margin={{ left: 15 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} /><YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => [`${value}%`, "Progress"]} /><Bar dataKey="value" radius={[0, 6, 6, 0]}>{data.completionByCategory.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Bar></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No category enrollment data yet.</div>}</div></article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2 className="font-bold">Recent activity</h2></div><div className="mt-4 divide-y divide-border">{data.activities.length ? data.activities.map((item) => <div key={item.id} className="flex gap-3 py-3 first:pt-0"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0"><p className="text-sm font-medium capitalize">{prettyAction(item.action)}</p><p className="text-xs text-muted-foreground">{item.actorName} · {item.entity} · {new Date(item.createdAt).toLocaleString()}</p></div></div>) : <p className="py-8 text-center text-sm text-muted-foreground">No audit activity yet.</p>}</div><Link href="/admin/activity-log" className="mt-3 inline-block text-sm font-semibold text-primary">View complete activity log →</Link></article>
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-primary" /><h2 className="font-bold">Actions requiring attention</h2></div><div className="mt-4 space-y-3">{data.pending.map((item) => <Link key={item.id} href={item.href} className="flex items-center justify-between rounded-xl border border-border p-4 transition hover:border-primary/40 hover:bg-muted/40"><div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">Open management page</p></div><span className={`rounded-full px-3 py-1 text-sm font-bold ${item.count ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{item.count}</span></Link>)}</div></article>
        </section>
      </main>
    </AdminLayout>
  );
}
