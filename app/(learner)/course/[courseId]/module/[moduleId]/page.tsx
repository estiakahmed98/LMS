'use client'

import TopNav from '@/components/TopNav'

export default function ModulePage({ params }: { params: { courseId: string; moduleId: string } }) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav title="Course Module" />
      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-card-foreground mb-4">Module Content</h1>
        <p className="text-muted-foreground mb-6">
          Course: {params.courseId} | Module: {params.moduleId}
        </p>
        
        {/* Video Player Placeholder */}
        <div className="aspect-video bg-muted rounded-lg border border-border flex items-center justify-center mb-8">
          <p className="text-muted-foreground">Video player placeholder - courseId: {params.courseId}, moduleId: {params.moduleId}</p>
        </div>

        {/* Module Content */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-card-foreground mb-4">Module Title</h2>
          <p className="text-muted-foreground">Module content goes here...</p>
        </div>
      </main>
    </div>
  )
}
