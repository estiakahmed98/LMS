'use client'

import Link from 'next/link'
import { getCertificatesByUserId, getCourseById } from '@/lib/mock-data'
import { getCurrentUser } from '@/lib/auth'
import { Award, ArrowRight, ShieldCheck, GraduationCap } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function CertificatesPage() {
  const t = useTranslations()
  const currentUser = getCurrentUser()
  const certificates = getCertificatesByUserId(currentUser?.id ?? '')

  return (
    <>
      <div className="flex items-center gap-3 mb-1">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
          <GraduationCap className="w-5 h-5" />
        </span>
        <h1 className="text-3xl font-bold">{t('certificatesPage.title')}</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        {t('certificatesPage.subtitle')}
      </p>

      {certificates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((certificate) => {
            const course = getCourseById(certificate.courseId)
            return (
              <Link
                key={certificate.id}
                href={`/certificates/${certificate.id}`}
                className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all"
              >
                <div className="relative h-28 bg-linear-to-br from-primary/15 via-primary/5 to-transparent flex items-center justify-center overflow-hidden">
                  <span className="absolute -right-4 -top-4 w-24 h-24 rounded-full border-8 border-primary/10" />
                  <span className="absolute -right-8 top-6 w-16 h-16 rounded-full border-4 border-primary/10" />
                  <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md border border-primary/20 text-primary">
                    <Award className="w-8 h-8" />
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <p className="font-semibold text-card-foreground leading-snug line-clamp-2">
                      {course?.title ?? t('certificatesPage.course')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('certificatesPage.certificateNumber', {
                        number: certificate.certificateNumber,
                      })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      {t('certificatesPage.issued', {
                        date: new Date(certificate.issueDate).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          },
                        ),
                      })}
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all">
                      {t('certificatesPage.view')} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {certificates.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-border rounded-xl">
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-muted text-muted-foreground mb-4">
            <Award className="w-8 h-8" />
          </span>
          <p className="text-foreground font-semibold text-lg">
            {t('certificatesPage.emptyTitle')}
          </p>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            {t('certificatesPage.emptyMessage')}
          </p>
        </div>
      )}
    </>
  )
}
