'use client'

import AdminLayout from '@/components/AdminLayout'
import { mockAssessments } from '@/lib/mock-data'

export default function AdminAssessmentsPage() {
  return (
    <AdminLayout title="Assessments">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-card-foreground">Assessments</h1>
        
        <div className="grid gap-4">
          {mockAssessments.map((assessment) => (
            <div key={assessment.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-bold text-card-foreground mb-2">{assessment.title}</h3>
              <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div>Type: {assessment.type}</div>
                <div>Total Marks: {assessment.totalMarks}</div>
                <div>Passing: {assessment.passingMarks}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
