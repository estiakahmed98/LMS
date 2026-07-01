'use client'

import AdminLayout from '@/components/AdminLayout'

const roles = ['SUPER_ADMIN', 'COURSE_MANAGER', 'EXAMINER', 'REPORT_VIEWER', 'STUDENT']

export default function RolesPage() {
  return (
    <AdminLayout title="Roles & Permissions">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-card-foreground">Roles & Permissions</h1>
        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role} className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-bold text-card-foreground mb-2">{role}</h3>
              <div className="text-sm text-muted-foreground">
                <p>Edit permissions for {role} role...</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
