"use client"

import AdminLayout from "@/components/AdminLayout"
import NotificationsActionPage from "@/components/admin/NotificationsActionPage"
import { sentMessages, triggerRules } from "@/lib/admin-panel-data"
import { BellRing, Edit3, Mail, MessageSquareText, Send, Smartphone } from "lucide-react"

export default function NotificationsPage() {
  return <NotificationsActionPage />

  return (
    <AdminLayout title="Notifications">
      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Compose Message</p>
            <h1 className="text-2xl font-bold text-card-foreground">Communication Center</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-card-foreground">
              Recipients
              <select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <option>By Course: Community Paramedic</option>
                <option>All Active Students</option>
                <option>Assessment Pending Students</option>
                <option>Certificate Eligible Students</option>
              </select>
            </label>

            <div>
              <p className="text-sm font-medium text-card-foreground">Channels</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { label: "In-App", icon: BellRing },
                  { label: "Email", icon: Mail },
                  { label: "SMS", icon: Smartphone },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <label key={item.label} className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                      <input type="checkbox" defaultChecked={item.label !== "SMS"} />
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <label className="mt-4 block text-sm font-medium text-card-foreground">
            Subject
            <input
              defaultValue="Exam reminder - Module 4"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-card-foreground">
            Message body
            <textarea
              defaultValue="Your Module 4 assessment is scheduled for tomorrow. Please arrive prepared and complete any pending lessons before the exam window opens."
              rows={8}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px]">
            <input className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" type="datetime-local" />
            <button className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              <Send className="h-4 w-4" />
              Send Now
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-card-foreground">Sent Messages</h2>
            </div>
            <div className="divide-y divide-border">
              {sentMessages.map((message) => (
                <div key={message.subject} className="grid grid-cols-[1fr_70px_60px] gap-3 py-3 text-sm">
                  <span className="font-medium text-card-foreground">{message.subject}</span>
                  <span className="text-muted-foreground">{message.channel}</span>
                  <span className="font-semibold text-green-700">{message.openRate}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold text-card-foreground">Automated Trigger Rules</h2>
            <div className="mt-4 space-y-3">
              {triggerRules.map((rule) => (
                <div key={rule} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                  <span className="text-sm font-medium text-card-foreground">{rule}</span>
                  <button className="rounded-lg border border-border p-2 hover:bg-muted" aria-label={`Edit ${rule}`}>
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AdminLayout>
  )
}
