'use client'

export default function ModulePage({ params }: { params: { id: string; moduleId: string } }) {
  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Module Content</h1>
      <p className="text-muted-foreground mb-6">
        Course: {params.id} | Module: {params.moduleId}
      </p>

      {/* Video Player Placeholder */}
      <div className="aspect-video bg-muted rounded-lg border border-border flex items-center justify-center mb-8">
        <p className="text-muted-foreground">Video player placeholder - courseId: {params.id}, moduleId: {params.moduleId}</p>
      </div>

      {/* Module Content */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Module Title</h2>
        <p className="text-muted-foreground">Module content goes here...</p>
      </div>
    </>
  )
}
