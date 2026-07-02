"use client"

import AdminLayout from "@/components/AdminLayout"
import { sentMessages, triggerRules } from "@/lib/admin-panel-data"
import { BellRing, Mail, Save, Send, Smartphone } from "lucide-react"
import { useState } from "react"

type Sent = (typeof sentMessages)[number]

export default function NotificationsActionPage() {
  const [subject, setSubject] = useState("Exam reminder - Module 4")
  const [message, setMessage] = useState("Your Module 4 assessment is scheduled for tomorrow.")
  const [channel, setChannel] = useState("Email")
  const [sent, setSent] = useState<Sent[]>(sentMessages)
  const [rules, setRules] = useState(triggerRules.map((rule) => ({ rule, enabled: true })))
  const [notice, setNotice] = useState("Ready")

  function sendMessage() {
    if (!subject.trim() || !message.trim()) {
      setNotice("Subject and message are required.")
      return
    }
    setSent((current) => [{ subject, channel, openRate: "0%" }, ...current])
    setNotice("Message sent in mock state.")
  }

  return (
    <AdminLayout title="Notifications">
      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Compose Message</p>
          <h1 className="text-2xl font-bold text-card-foreground">Communication Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">{notice}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <select className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>By Course: Community Paramedic</option>
              <option>All Active Students</option>
              <option>Assessment Pending Students</option>
            </select>
            <div className="grid grid-cols-3 gap-2">
              {[{ label: "In-App", icon: BellRing }, { label: "Email", icon: Mail }, { label: "SMS", icon: Smartphone }].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={() => setChannel(item.label)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${channel === item.label ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={8} className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_160px]">
            <input className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" type="datetime-local" />
            <button onClick={() => setNotice("Message scheduled in mock state.")} className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
              <Save className="h-4 w-4" />
              Schedule
            </button>
            <button onClick={sendMessage} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              <Send className="h-4 w-4" />
              Send Now
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold text-card-foreground">Sent Messages</h2>
            <div className="mt-3 divide-y divide-border">
              {sent.map((item, index) => (
                <div key={`${item.subject}-${index}`} className="grid grid-cols-[1fr_70px_60px] gap-3 py-3 text-sm">
                  <span className="font-medium">{item.subject}</span>
                  <span className="text-muted-foreground">{item.channel}</span>
                  <span className="font-semibold text-green-700">{item.openRate}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold text-card-foreground">Automated Trigger Rules</h2>
            <div className="mt-4 space-y-3">
              {rules.map((item, index) => (
                <label key={item.rule} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-sm font-medium">
                  <input value={item.rule} onChange={(event) => setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, rule: event.target.value } : rule))} className="min-w-0 flex-1 bg-transparent outline-none" />
                  <input type="checkbox" checked={item.enabled} onChange={(event) => setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, enabled: event.target.checked } : rule))} />
                </label>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AdminLayout>
  )
}
