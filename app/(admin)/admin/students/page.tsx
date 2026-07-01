'use client'

import AdminLayout from '@/components/AdminLayout'
import {
  mockUsers,
  mockEnrollments,
  getEnrollmentsByUserId,
  mockSubmissions,
  Status,
} from '@/lib/mock-data'
import { useState } from 'react'
import { Search, Filter, ChevronRight, Mail, Phone, Calendar, BookOpen } from 'lucide-react'

export default function AdminStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<Status | 'ALL'>('ALL')

  // Filter students only
  const students = mockUsers.filter((u) => u.role === 'STUDENT')

  // Apply filters
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const selectedStudentData = students.find((s) => s.id === selectedStudent)
  const studentEnrollments = selectedStudent
    ? getEnrollmentsByUserId(selectedStudent)
    : []
  const studentSubmissions = selectedStudent
    ? mockSubmissions.filter((s) => s.userId === selectedStudent)
    : []

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/10 text-green-700 border-green-500/20'
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
      case 'SUSPENDED':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    }
  }

  return (
    <AdminLayout title='Students'>
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Students Table */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Courses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((student) => {
                    const enrollmentCount = getEnrollmentsByUserId(student.id).length
                    return (
                      <tr key={student.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                          {student.id}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-card-foreground">
                              {student.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-card-foreground">
                          {enrollmentCount}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full border ${getStatusColor(
                              student.status as Status
                            )}`}
                          >
                            {student.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedStudent(student.id)}
                            className="text-primary hover:text-primary/80 transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No students found</p>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedStudentData ? (
              <div className="bg-card border border-border rounded-lg overflow-hidden sticky top-6">
                <div className="bg-primary text-primary-foreground p-4">
                  <h3 className="font-bold text-lg">{selectedStudentData.name}</h3>
                </div>

                <div className="p-4 space-y-4">
                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Email</p>
                      <p className="text-sm text-card-foreground">
                        {selectedStudentData.email}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  {selectedStudentData.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Phone</p>
                        <p className="text-sm text-card-foreground">
                          {selectedStudentData.phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Joined Date */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Joined</p>
                      <p className="text-sm text-card-foreground">
                        {selectedStudentData.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Status
                    </p>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full border inline-block ${getStatusColor(
                        selectedStudentData.status as Status
                      )}`}
                    >
                      {selectedStudentData.status}
                    </span>
                  </div>

                  {/* Enrollments */}
                  {studentEnrollments.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Enrollments
                      </p>
                      <div className="space-y-2">
                        {studentEnrollments.map((enroll) => (
                          <div
                            key={enroll.id}
                            className="text-xs p-2 bg-muted rounded border border-border"
                          >
                            <p className="font-medium text-card-foreground">
                              Course ID: {enroll.courseId}
                            </p>
                            <p className="text-muted-foreground">
                              Progress: {enroll.progress}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-border space-y-2">
                    <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                      Approve All Pending
                    </button>
                    <button className="w-full px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium">
                      View Submissions
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center sticky top-6">
                <p className="text-muted-foreground">
                  Select a student to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
