"use client"

import AdminLayout from "@/components/AdminLayout"
import { useTranslations } from "next-intl"
import { KeyRound, LockKeyhole, MailCheck, Plug, RotateCcw, Save, Shield, SlidersHorizontal } from "lucide-react"
import { useState } from "react"

export default function SettingsActionPage() {
  const t = useTranslations("adminSettingsPage")
  const tAdmin = useTranslations("admin")
  const tabs = [
    { label: t("tabs.general"), icon: SlidersHorizontal },
    { label: t("tabs.assessment"), icon: Shield },
    { label: t("tabs.emailSms"), icon: MailCheck },
    { label: t("tabs.security"), icon: LockKeyhole },
    { label: t("tabs.integrations"), icon: Plug },
  ]
  const [activeTab, setActiveTab] = useState(t("tabs.security"))
  const [notice, setNotice] = useState(t("notice.ready"))
  const [apiKey, setApiKey] = useState("api_live_********")
  const [general, setGeneral] = useState({
    name: t("general.lmsName"),
    brand: t("general.brandColor"),
    timezone: t("general.timezone"),
    language: t("general.language"),
    pass: t("general.defaultPassMark"),
  })

  return (
    <AdminLayout title={tAdmin("settings")}>
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

          {activeTab === t("tabs.general") && (
            <div className="grid gap-4 lg:grid-cols-2">
              <input value={general.name} onChange={(event) => setGeneral({ ...general, name: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={general.brand} onChange={(event) => setGeneral({ ...general, brand: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={general.timezone} onChange={(event) => setGeneral({ ...general, timezone: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={general.language} onChange={(event) => setGeneral({ ...general, language: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={general.pass} onChange={(event) => setGeneral({ ...general, pass: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
          )}

          {activeTab === t("tabs.assessment") && (
            <div className="grid gap-4 lg:grid-cols-2">
              <input defaultValue={t("assessment.timeLimit")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input defaultValue={t("assessment.maxAttempts")} type="number" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">{t("assessment.dualMode")}<input type="checkbox" defaultChecked /></label>
              <input defaultValue={t("assessment.ocrStatus")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input defaultValue={t("assessment.omrQueue")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
          )}

          {activeTab === t("tabs.emailSms") && (
            <div className="grid gap-4 lg:grid-cols-2">
              <input defaultValue={t("emailSms.smtpHost")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input defaultValue={t("emailSms.smtpUsername")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input defaultValue={t("emailSms.smsGatewayKey")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <button onClick={() => setNotice(t("notice.testEmail"))} className="rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">{t("emailSms.sendTestEmail")}</button>
              <textarea defaultValue={t("emailSms.template")} rows={5} className="lg:col-span-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
          )}

          {activeTab === t("tabs.security") && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-5">
                <div className="rounded-lg border border-border p-4">
                  <h2 className="font-semibold text-card-foreground">{t("security.passwordPolicy")}</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <input defaultValue={t("security.minLength")} type="number" className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                    <select className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"><option>{t("security.complexityMixed")}</option><option>{t("security.complexityHigh")}</option></select>
                    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">{t("security.specialChars")}<input type="checkbox" defaultChecked /></label>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <h2 className="font-semibold text-card-foreground">{t("security.sessionAccess")}</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <input defaultValue={t("security.sessionTimeout")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                    <input defaultValue={t("security.lockoutAfter")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">{t("security.enforce2fa")}<input type="checkbox" defaultChecked /></label>
                  </div>
                </div>
              </div>
              <aside className="rounded-lg border border-border p-4">
                <h2 className="font-semibold text-card-foreground">{t("security.ipWhitelist")}</h2>
                <div className="mt-4 space-y-3">
                  <input defaultValue={t("security.ip1")} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <input defaultValue={t("security.ip2")} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <button onClick={() => setNotice(t("notice.ipAdded"))} className="w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">{t("security.addIp")}</button>
                </div>
              </aside>
            </div>
          )}

          {activeTab === t("tabs.integrations") && (
            <div className="grid gap-4 lg:grid-cols-2">
              <input defaultValue={t("integrations.webhookUrl")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <div className="flex gap-2">
                <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                <button onClick={() => setApiKey(`api_live_${Math.random().toString(36).slice(2, 10)}`)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                  <RotateCcw className="h-4 w-4" />
                  {t("integrations.regenerate")}
                </button>
              </div>
              <input defaultValue={t("integrations.zoomEmbed")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input defaultValue={t("integrations.paymentGateway")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
          )}

          <button onClick={() => setNotice(t("notice.saved", { tab: activeTab }))} className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            <Save className="h-4 w-4" />
            {t("actions.saveSettings")}
          </button>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold text-card-foreground">{t("configStatus.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{notice}</p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
