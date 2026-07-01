'use client'

export default function MCQAssessmentPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Multiple Choice Assessment</h1>
      <p className="text-muted-foreground mb-8">Assessment ID: {params.id}</p>

      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <h2 className="text-xl font-bold text-card-foreground">Question 1</h2>
        <p className="text-muted-foreground">Question text goes here...</p>

        <div className="space-y-3">
          {['Option A', 'Option B', 'Option C', 'Option D'].map((opt, idx) => (
            <label key={idx} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted cursor-pointer">
              <input type="radio" name="answer" className="w-4 h-4" />
              <span className="text-card-foreground">{opt}</span>
            </label>
          ))}
        </div>

        <button className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold">
          Submit Assessment
        </button>
      </div>
    </div>
  )
}
