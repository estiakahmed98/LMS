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
import { useLocale, useTranslations } from "next-intl"

const statIcons = [Users, BookOpen, FileText, CheckCircle2, Award, WalletCards]
const barColors = ["#DC2626", "#2563EB", "#16A34A", "#9333EA"]

export default function AdminDashboardPage() {
  const t = useTranslations("adminDashboard")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const localeTag = locale === "bn" ? "bn-BD" : "en-US"
  const numberFormatter = new Intl.NumberFormat(localeTag)
  const percentFormatter = new Intl.NumberFormat(localeTag, {
    maximumFractionDigits: 1,
  })
  const currencyFormatter = new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  })

  const formatStatValue = (stat: (typeof dashboardStats)[number]) => {
    if (stat.valueType === "currency") {
      return currencyFormatter.format(stat.value)
    }

    if (stat.valueType === "percentage") {
      return `${numberFormatter.format(stat.value)}%`
    }

    return numberFormatter.format(stat.value)
  }

  const formatStatDelta = (stat: (typeof dashboardStats)[number]) => {
    if (stat.deltaType === "percent") {
      return `+${percentFormatter.format(stat.deltaValue)}%`
    }

    if (stat.deltaType === "thisMonth") {
      return t("statsDelta.thisMonth", {
        count: numberFormatter.format(stat.deltaValue),
      })
    }

    return t("statsDelta.dueToday", {
      count: numberFormatter.format(stat.deltaValue),
    })
  }

  const localizedStats = dashboardStats.map((stat) => ({
    ...stat,
    label: t(`stats.${stat.id}.label`),
    value: formatStatValue(stat),
    delta: formatStatDelta(stat),
  }))

  const localizedEnrollmentTrend = enrollmentTrend.map((entry) => ({
    ...entry,
    weekLabel: t("charts.weekShort", {
      week: numberFormatter.format(entry.week),
    }),
  }))

  const localizedCompletionByCategory = completionByCategory.map((entry) => ({
    ...entry,
    name: t(`categories.${entry.id}`),
  }))

  const localizedActivityFeed = activityFeed.map((entry) => ({
    ...entry,
    label: t(`activity.items.${entry.id}`),
  }))

  const localizedPendingActions = pendingActions.map((entry) => ({
    ...entry,
    label: t(`pending.items.${entry.id}`),
  }))

  return (
    <AdminLayout title={tCommon("dashboard")}>
      <div className="space-y-6 p-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          {localizedStats.map((stat, index) => {
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
                <h2 className="text-lg font-semibold text-card-foreground">{t("charts.weeklyEnrollmentTrend")}</h2>
                <p className="text-sm text-muted-foreground">{t("charts.last12Weeks")}</p>
              </div>
              <span className="rounded-lg border border-border bg-background px-3 py-1 text-sm font-medium">
                {t("charts.newThisWeek", {
                  count: numberFormatter.format(79),
                })}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={localizedEnrollmentTrend}>
                <defs>
                  <linearGradient id="enrollmentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="weekLabel" stroke="var(--muted-foreground)" />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tickFormatter={(value) => numberFormatter.format(Number(value))}
                />
                <Tooltip
                  formatter={(value) => [
                    numberFormatter.format(Number(value)),
                    t("charts.enrollmentsLabel"),
                  ]}
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
            <h2 className="text-lg font-semibold text-card-foreground">{t("charts.completionRateByCategory")}</h2>
            <p className="text-sm text-muted-foreground">{t("charts.courseCategoryDistribution")}</p>
            <div className="mt-5">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={localizedCompletionByCategory} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="var(--muted-foreground)"
                    tickFormatter={(value) => `${numberFormatter.format(Number(value))}%`}
                  />
                  <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" width={80} />
                  <Tooltip
                    formatter={(value) => [
                      `${numberFormatter.format(Number(value))}%`,
                      t("charts.completionRateLabel"),
                    ]}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {localizedCompletionByCategory.map((entry, index) => (
                      <Cell key={entry.id} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-card-foreground">{t("activity.title")}</h2>
            <div className="mt-4 space-y-4">
              {localizedActivityFeed.map((activity) => (
                <div key={activity.id} className="flex gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{activity.label}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-card-foreground">{t("pending.title")}</h2>
            <div className="mt-4 space-y-3">
              {localizedPendingActions.map((action) => (
                <div key={action.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <p className="text-sm font-medium text-card-foreground">{action.label}</p>
                  </div>
                  <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted">
                    {t("pending.review")}
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
