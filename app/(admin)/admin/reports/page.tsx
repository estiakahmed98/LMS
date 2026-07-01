'use client'

import AdminLayout from '@/components/AdminLayout'

export default function ReportsPage() {

  return (
    <AdminLayout title='Reports'>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-card-foreground">Reports</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['Enrollment Report', 'Performance Report', 'Completion Report', 'Assessment Report'].map(
            (report) => (
              <div key={report} className="bg-card border border-border rounded-lg p-4 hover:shadow-md cursor-pointer">
                <h3 className="font-bold text-card-foreground">{report}</h3>
                <p className="text-sm text-muted-foreground mt-2">Generate and view {report.toLowerCase()}</p>
              </div>
            )
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
