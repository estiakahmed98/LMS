"use client";

import AdminLayout from "@/components/AdminLayout";
import SettingsActionPage from "@/components/admin/SettingsActionPage";
import {
  KeyRound,
  LockKeyhole,
  MailCheck,
  Plug,
  Save,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";

const tabs = [
  { label: "General", icon: SlidersHorizontal },
  { label: "Assessment", icon: Shield },
  { label: "Email & SMS", icon: MailCheck },
  { label: "Security", icon: LockKeyhole },
  { label: "Integrations", icon: Plug },
];

export default function SettingsPage() {
  return <SettingsActionPage />;

  const [activeTab, setActiveTab] = useState("Security");

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-5 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab.label)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "General" && (
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                ["LMS name", "BOED LMS"],
                ["Brand color", "#DC2626"],
                ["Timezone", "Asia/Dhaka"],
                ["Language", "English / Bengali"],
                ["Default pass mark", "70%"],
              ].map(([label, value]) => (
                <label
                  key={label}
                  className="block text-sm font-medium text-card-foreground"
                >
                  {label}
                  <input
                    defaultValue={value}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </label>
              ))}
            </div>
          )}

          {activeTab === "Assessment" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block text-sm font-medium text-card-foreground">
                Global time limit
                <input
                  defaultValue="30 minutes"
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-card-foreground">
                Max attempts
                <input
                  defaultValue="2"
                  type="number"
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                Dual-Mode assessment delivery
                <input type="checkbox" defaultChecked />
              </label>
              <label className="block text-sm font-medium text-card-foreground">
                OCR engine status
                <input
                  defaultValue="Online - Queue healthy"
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-card-foreground">
                OMR queue depth
                <input
                  defaultValue="7 scans pending"
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
            </div>
          )}

          {activeTab === "Email & SMS" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <input
                placeholder="SMTP host"
                defaultValue="smtp.pstc.org"
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              <input
                placeholder="SMTP username"
                defaultValue="mailer@pstc.org"
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              <input
                placeholder="SMS gateway key"
                defaultValue="sk_test_sms_gateway"
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              <button className="rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                Send Test Email
              </button>
              <textarea
                defaultValue="Hello {{student_name}}, your score is {{score}}."
                rows={5}
                className="lg:col-span-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
          )}

          {activeTab === "Security" && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-5">
                <div className="rounded-lg border border-border p-4">
                  <h2 className="font-semibold text-card-foreground">
                    Password Policy
                  </h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="block text-sm font-medium text-card-foreground">
                      Min length
                      <input
                        defaultValue="10"
                        type="number"
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-medium text-card-foreground">
                      Complexity
                      <select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                        <option>Mixed</option>
                        <option>High</option>
                      </select>
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                      Require special characters
                      <input type="checkbox" defaultChecked />
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h2 className="font-semibold text-card-foreground">
                    Session & Access
                  </h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="block text-sm font-medium text-card-foreground">
                      Session timeout
                      <input
                        defaultValue="30 min"
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-medium text-card-foreground">
                      Lockout after
                      <input
                        defaultValue="5 attempts"
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                      Enforce 2FA
                      <input type="checkbox" defaultChecked />
                    </label>
                  </div>
                </div>
              </div>

              <aside className="rounded-lg border border-border p-4">
                <h2 className="font-semibold text-card-foreground">
                  IP Whitelist
                </h2>
                <div className="mt-4 space-y-3">
                  {[
                    ["203.0.113.14", "HQ Office"],
                    ["198.51.100.22", "Remote Admin"],
                  ].map(([ip, label]) => (
                    <div key={ip} className="grid grid-cols-[1fr_120px] gap-2">
                      <input
                        defaultValue={ip}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <input
                        defaultValue={label}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                  <button className="w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                    Add IP Address
                  </button>
                </div>
              </aside>
            </div>
          )}

          {activeTab === "Integrations" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <input
                placeholder="Webhook URL"
                defaultValue="https://pstc.org/webhooks/lms"
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              <div className="flex gap-2">
                <input
                  defaultValue="api_live_********"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
                <button className="rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                  Regenerate
                </button>
              </div>
              <input
                defaultValue="Zoom/Meet auto-embed: Enabled"
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              <input
                defaultValue="Payment gateway: Configured"
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
          )}

          <button className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold text-card-foreground">
                Configuration coverage
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                General branding, assessment rules, email/SMS templates,
                security policy, and integration keys are available from this
                control surface.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
