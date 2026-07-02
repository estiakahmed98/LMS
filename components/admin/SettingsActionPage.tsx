"use client"

import AdminLayout from "@/components/AdminLayout"
import { KeyRound, LockKeyhole, MailCheck, Plug, RotateCcw, Save, Shield, SlidersHorizontal } from "lucide-react"
import { useState } from "react"

const tabs = [
  { label: "General", icon: SlidersHorizontal },
  { label: "Assessment", icon: Shield },
  { label: "Email & SMS", icon: MailCheck },
  { label: "Security", icon: LockKeyhole },
  { label: "Integrations", icon: Plug },
]

export default function SettingsActionPage() {
  const [activeTab, setActiveTab] = useState("Security")
  const [notice, setNotice] = useState("Ready")
  const [apiKey, setApiKey] = useState("api_live_********")
  const [general, setGeneral] = useState({
    name: "PSTC LMS",
    brand: "#DC2626",
    timezone: "Asia/Dhaka",
    language: "English / Bengali",
    pass: "70%",
  })

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-5 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.label
              return (
                <button key={tab.label} onClick={() => setActiveTab(tab.label)} className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}>
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === "General" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <input value={general.name} onChange={(event) => setGeneral({ ...general, name: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={general.brand} onChange={(event) => setGeneral({ ...general, brand: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={general.timezone} onChange={(event) => setGeneral({ ...general, timezone: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={general.language} onChange={(event) => setGeneral({ ...general, language: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={general.pass} onChange={(event) => setGeneral({ ...general, pass: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
          )}

          {activeTab === "Assessment" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <input defaultValue="30 minutes" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input defaultValue="2" type="number" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">Dual-Mode delivery<input type="checkbox" defaultChecked /></label>
              <input defaultValue="Online - Queue healthy" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input defaultValue="7 scans pending" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
          )}

          {activeTab === "Email & SMS" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <input defaultValue="smtp.pstc.org" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input defaultValue="mailer@pstc.org" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input defaultValue="sk_test_sms_gateway" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <button onClick={() => setNotice("Test email sent in mock mode.")} className="rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">Send Test Email</button>
              <textarea defaultValue="Hello {{student_name}}, your score is {{score}}." rows={5} className="lg:col-span-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
          )}

          {activeTab === "Security" && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-5">
                <div className="rounded-lg border border-border p-4">
                  <h2 className="font-semibold text-card-foreground">Password Policy</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <input defaultValue="10" type="number" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                    <select className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"><option>Mixed</option><option>High</option></select>
                    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">Special characters<input type="checkbox" defaultChecked /></label>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <h2 className="font-semibold text-card-foreground">Session & Access</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <input defaultValue="30 min" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                    <input defaultValue="5 attempts" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">Enforce 2FA<input type="checkbox" defaultChecked /></label>
                  </div>
                </div>
              </div>
              <aside className="rounded-lg border border-border p-4">
                <h2 className="font-semibold text-card-foreground">IP Whitelist</h2>
                <div className="mt-4 space-y-3">
                  <input defaultValue="203.0.113.14 - HQ Office" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <input defaultValue="198.51.100.22 - Remote Admin" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <button onClick={() => setNotice("IP address added in mock mode.")} className="w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">Add IP Address</button>
                </div>
              </aside>
            </div>
          )}

          {activeTab === "Integrations" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <input defaultValue="https://pstc.org/webhooks/lms" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <div className="flex gap-2">
                <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                <button onClick={() => setApiKey(`api_live_${Math.random().toString(36).slice(2, 10)}`)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                  <RotateCcw className="h-4 w-4" />
                  Regenerate
                </button>
              </div>
              <input defaultValue="Zoom/Meet auto-embed: Enabled" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input defaultValue="Payment gateway: Configured" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
          )}

          <button onClick={() => setNotice(`${activeTab} settings saved.`)} className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold text-card-foreground">Configuration status</h2>
              <p className="mt-1 text-sm text-muted-foreground">{notice}</p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
