'use client'

import AdminLayout from '@/components/AdminLayout'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  mockUsers,
  mockCourses,
  mockEnrollments,
  mockSubmissions,
  mockAuditLogs,
  Status,
} from '@/lib/mock-data'
import { Users, BookOpen, FileText, Award, TrendingUp } from 'lucide-react'

// Generate mock weekly enrollment data
const generateWeeklyData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((day, idx) => ({
    day,
    enrollments: Math.floor(Math.random() * 15) + 5,
  }))
}

const weeklyData = generateWeeklyData()

// Calculate completion rate
const completedEnrollments = mockEnrollments.filter((e) => e.progress === 100).length
const totalEnrollments = mockEnrollments.length
const completionRate = Math.round((completedEnrollments / totalEnrollments) * 100)

const pieData = [
  { name: 'Completed', value: completedEnrollments },
  { name: 'In Progress', value: totalEnrollments - completedEnrollments },
]

const COLORS = ['#DC2626', '#FCA5A5']

// Count active statuses
const activeStudents = mockUsers.filter((u) => u.status === 'ACTIVE').length
const pendingApprovals = mockEnrollments.filter((e) => e.status === 'PENDING').length

export default function AdminDashboardPage() {

  const stats = [
    {
      title: 'Total Students',
      value: mockUsers.filter((u) => u.role === 'STUDENT').length,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Courses',
      value: mockCourses.length,
      icon: BookOpen,
      color: 'bg-green-500',
    },
    {
      title: 'Pending Assessments',
      value: mockSubmissions.filter((s) => s.status === 'SUBMITTED').length,
      icon: FileText,
      color: 'bg-yellow-500',
    },
    {
      title: 'Certificates Issued',
      value: mockSubmissions.filter((s) => s.status === 'GRADED').length,
      icon: Award,
      color: 'bg-purple-500',
    },
  ]

  return (
    <AdminLayout title="Dashboard">
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-card-foreground mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-primary">
                  <TrendingUp className="w-4 h-4" />
                  <span>+2.5% from last week</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Enrollment Chart */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              {'Weekly Enrollment Trend'}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="enrollments"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--primary)', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Completion Rate Chart */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              {'Completion Rate'}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity and Pending Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              {'Recent Activity'}
            </h3>
            <div className="space-y-3">
              {mockAuditLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 pb-3 border-b border-border last:border-0"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-card-foreground">
                      {log.action} - {log.entity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Actions */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              {'Pending Actions'}
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm font-medium text-card-foreground">
                  {pendingApprovals} Pending Enrollments
                </p>
                <p className="text-xs text-muted-foreground">
                  Awaiting approval from administrators
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm font-medium text-card-foreground">
                  {mockSubmissions.filter((s) => s.status === 'GRADING').length} Submissions Under Grading
                </p>
                <p className="text-xs text-muted-foreground">
                  Awaiting examiner feedback
                </p>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm font-medium text-card-foreground">
                  {mockCourses.length} Active Courses
                </p>
                <p className="text-xs text-muted-foreground">
                  Currently running with active enrollments
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-sm font-medium text-card-foreground">
                  System Operating Normally
                </p>
                <p className="text-xs text-muted-foreground">
                  All services running smoothly
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
