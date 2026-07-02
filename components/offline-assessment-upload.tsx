'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import { Camera, ImagePlus, X, CheckCircle2 } from 'lucide-react'
import type { Assessment } from '@/lib/mock-data'
import { submitOfflineAssessment } from '@/lib/mock-data'

export default function OfflineAssessmentUpload({
  assessment,
  userId,
}: {
  assessment: Assessment
  userId: string
}) {
  const router = useRouter()
  const [pages, setPages] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => setPages((prev) => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
  }

  function removePage(index: number) {
    setPages((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    submitOfflineAssessment(assessment.id, userId, pages)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-6">
          <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto" />
          <h1 className="text-3xl font-bold text-card-foreground">Answer Sheet Submitted</h1>
          <p className="text-lg text-muted-foreground">
            Your scanned answer sheet has been submitted for review. You&apos;ll be notified once
            it&apos;s graded.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">{assessment.title}</h1>
      <p className="text-muted-foreground mb-8">
        {assessment.totalMarks} marks · Pass at {assessment.passingMarks} marks
      </p>

      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-card-foreground mb-2">
            Offline Assessment
          </h2>
          <p className="text-muted-foreground">
            This is an offline assessment. Complete it on paper, then scan or photograph each
            page of your answer sheet and upload it here for review.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {pages.map((page, index) => (
            <div
              key={index}
              className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border group"
            >
              <Image
                src={page}
                alt={`Answer sheet page ${index + 1}`}
                fill
                className="object-cover"
              />
              <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                Page {index + 1}
              </span>
              <button
                onClick={() => removePage(index)}
                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label={`Remove page ${index + 1}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex items-center justify-center gap-2 flex-1 px-4 py-3 border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-muted transition-colors">
            <Camera className="w-4 h-4" />
            Scan with Camera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </label>

          <label className="flex items-center justify-center gap-2 flex-1 px-4 py-3 border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-muted transition-colors">
            <ImagePlus className="w-4 h-4" />
            Upload from Gallery
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </label>
        </div>

        <button
          disabled={pages.length === 0}
          onClick={handleSubmit}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answer Sheet ({pages.length} page{pages.length !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  )
}
