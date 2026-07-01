'use client'

import AdminLayout from '@/components/AdminLayout'
import { mockSubmissions } from '@/lib/mock-data'

export default function SubmissionsPage() {

  return (
    <AdminLayout title='Submissions'>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-card-foreground">Submissions</h1>
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold">Assessment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold">Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockSubmissions.map((sub) => (
                <tr key={sub.id}>
                  <td className="px-6 py-4 text-sm">{sub.id}</td>
                  <td className="px-6 py-4 text-sm">{sub.assessmentId}</td>
                  <td className="px-6 py-4 text-sm">{sub.status}</td>
                  <td className="px-6 py-4 text-sm">{sub.obtainedMarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
