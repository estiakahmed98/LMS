'use client'

import AdminLayout from '@/components/AdminLayout'
import { mockCertificates } from '@/lib/mock-data'

export default function CertificatesPage() {

  return (
    <AdminLayout title='Certificates'>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-card-foreground">Certificates</h1>
        <div className="grid gap-4">
          {mockCertificates.map((cert) => (
            <div key={cert.id} className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-bold text-card-foreground">
                Certificate #{cert.certificateNumber}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Issued: {cert.issueDate.toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
