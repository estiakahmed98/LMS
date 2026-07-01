'use client'

import AdminLayout from '@/components/AdminLayout'
import { useState } from 'react'

const tabs = ['Details', 'Questions', 'Settings', 'Review']

export default function AssessmentBuilderPage() {
  const [activeTab, setActiveTab] = useState('Details')

  return (
    <AdminLayout title="Build Assessment">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-card-foreground">Create New Assessment</h1>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-card-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-card border border-border rounded-lg p-6">
          {activeTab === 'Details' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-card-foreground">Assessment Details</h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Assessment title..."
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Course
                  </label>
                  <select className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option>Select a course...</option>
                    <option>Community Paramedic Training</option>
                    <option>HR Recruitment & Assessment</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Questions' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-card-foreground">Questions</h2>
              <p className="text-muted-foreground">Add questions to your assessment...</p>
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                + Add Question
              </button>
            </div>
          )}

          {activeTab === 'Settings' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-card-foreground">Settings</h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Total Marks
                  </label>
                  <input type="number" placeholder="100" className="w-full px-4 py-2 border border-border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Passing Marks
                  </label>
                  <input type="number" placeholder="40" className="w-full px-4 py-2 border border-border rounded-lg" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Review' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-card-foreground">Review & Publish</h2>
              <p className="text-muted-foreground">Review your assessment before publishing...</p>
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                Publish Assessment
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
