'use client'

import Link from 'next/link'
import { getCertificatesByUserId, getCourseById } from '@/lib/mock-data'
import { getCurrentUser } from '@/lib/auth'
import { Award } from 'lucide-react'

export default function CertificatesPage() {
  const currentUser = getCurrentUser()
  const certificates = getCertificatesByUserId(currentUser?.id ?? '')

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Certificates</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map((certificate) => {
          const course = getCourseById(certificate.courseId)
          return (
            <Link
              key={certificate.id}
              href={`/certificates/${certificate.id}`}
              className="bg-card border border-border rounded-lg p-6 text-center hover:shadow-lg transition-shadow"
            >
              <Award className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="font-semibold text-card-foreground">{course?.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Issued {certificate.issueDate.toLocaleDateString()}
              </p>
            </Link>
          )
        })}
      </div>

      {certificates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No certificates earned yet.</p>
        </div>
      )}
    </>
  )
}
