"use client"

import AdminLayout from "@/components/AdminLayout"
import {
  activityFeed,
  completionByCategory,
  dashboardStats,
  enrollmentTrend,
  pendingActions,
} from "@/lib/admin-panel-data"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react"

const statIcons = [Users, BookOpen, FileText, CheckCircle2, Award, WalletCards]
const barColors = ["#DC2626", "#2563EB", "#16A34A", "#9333EA"]

export default function AdminDashboardPage() {
  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6 p-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          {dashboardStats.map((stat, index) => {
            const Icon = statIcons[index]
            return (
              <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {stat.delta}
                  </span>
                </div>
                <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            )
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">
                  Weekly Enrollment Trend
                </h2>
                <p className="text-sm text-muted-foreground">Last 12 weeks</p>
              </div>
              <span className="rounded-lg border border-border bg-background px-3 py-1 text-sm font-medium">
                +79 new this week
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={enrollmentTrend}>
                <defs>
                  <linearGradient id="enrollmentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  dataKey="enrollments"
                  fill="url(#enrollmentFill)"
                  stroke="#DC2626"
                  strokeWidth={3}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-card-foreground">
              Completion Rate by Category
            </h2>
            <p className="text-sm text-muted-foreground">Course category distribution</p>
            <div className="mt-5">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={completionByCategory} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" />
                  <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" width={80} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {completionByCategory.map((entry, index) => (
                      <Cell key={entry.name} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-card-foreground">Recent Activity Feed</h2>
            <div className="mt-4 space-y-4">
              {activityFeed.map((activity, index) => (
                <div key={activity} className="flex gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{activity}</p>
                    <p className="text-xs text-muted-foreground">
                      {["09:41", "09:15", "08:52", "08:20"][index]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-card-foreground">Pending Actions</h2>
            <div className="mt-4 space-y-3">
              {pendingActions.map((action) => (
                <div key={action} className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <p className="text-sm font-medium text-card-foreground">{action}</p>
                  </div>
                  <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted">
                    Review
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
