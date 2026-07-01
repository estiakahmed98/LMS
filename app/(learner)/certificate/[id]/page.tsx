'use client'

import TopNav from '@/components/TopNav'
import { Award, Download, Share2 } from 'lucide-react'

export default function CertificatePage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav title="Certificate" />
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-card-foreground">Your Certificate</h1>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
              <Download className="w-4 h-4" />
              Download
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>

        {/* Certificate Display */}
        <div className="bg-card border-4 border-primary rounded-lg p-12 text-center space-y-6 shadow-xl">
          <Award className="w-24 h-24 text-primary mx-auto" />
          <div>
            <h2 className="text-4xl font-bold text-primary mb-2">Certificate of Completion</h2>
            <p className="text-muted-foreground">This certifies that</p>
          </div>
          <p className="text-2xl font-bold text-card-foreground">Student Name</p>
          <p className="text-muted-foreground">has successfully completed the course</p>
          <p className="text-xl font-semibold text-card-foreground">Course Title</p>
          <div className="pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">Certificate ID: {params.id}</p>
            <p className="text-sm text-muted-foreground">Date Issued: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
