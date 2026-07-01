'use client'

import AdminLayout from '@/components/AdminLayout'

export default function GradingPage() {

  return (
    <AdminLayout title='Grading'>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-card-foreground mb-6">Grading</h1>
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Grading management interface - Ready for backend integration</p>
        </div>
      </div>
    </AdminLayout>
  )
}
