"use client"

import AdminLayout from "@/components/AdminLayout"
import { sentMessages, triggerRules } from "@/lib/admin-panel-data"
import { useTranslations } from "next-intl"
import { BellRing, Mail, Save, Send, Smartphone } from "lucide-react"
import { useState } from "react"

type Sent = (typeof sentMessages)[number]
type Channel = "In-App" | "Email" | "SMS"
type Notice = { key: "ready" | "validationError" | "sent" | "scheduled" }

const channels: Array<{ label: Channel; icon: typeof BellRing }> = [
  { label: "In-App", icon: BellRing },
  { label: "Email", icon: Mail },
  { label: "SMS", icon: Smartphone },
]

export default function NotificationsActionPage() {
  const t = useTranslations("adminNotificationsPage")
  const tAdmin = useTranslations("admin")
  const [subject, setSubject] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [channel, setChannel] = useState<Channel>("Email")
  const [sent, setSent] = useState<Sent[]>(sentMessages)
  const [rules, setRules] = useState(triggerRules.map((rule) => ({ rule, enabled: true })))
  const [notice, setNotice] = useState<Notice>({ key: "ready" })

  const subjectValue = subject ?? t("compose.defaultSubject")
  const messageValue = message ?? t("compose.defaultMessage")

  function getChannelLabel(value: string) {
    switch (value) {
      case "In-App":
        return t("channels.inApp")
      case "Email":
        return t("channels.email")
      case "SMS":
        return t("channels.sms")
      default:
        return value
    }
  }

  function getSubjectLabel(value: string) {
    switch (value) {
      case "Exam reminder - Mod 4":
        return t("sent.subjects.examReminderMod4")
      case "Certificate issued":
        return t("sent.subjects.certificateIssued")
      default:
        return value
    }
  }

  function getRuleLabel(value: string) {
    switch (value) {
      case "Send reminder 1 day before exam":
        return t("rules.sendReminder")
      case "Send certificate on pass":
        return t("rules.sendCertificate")
      case "Alert admin on scan upload":
        return t("rules.alertScanUpload")
      case "Notify on assessment dispute":
        return t("rules.notifyDispute")
      case "Weekly progress digest to students":
        return t("rules.weeklyDigest")
      default:
        return value
    }
  }

  function sendMessage() {
    if (!subjectValue.trim() || !messageValue.trim()) {
      setNotice({ key: "validationError" })
      return
    }
    setSent((current) => [{ subject: subjectValue, channel, openRate: "0%" }, ...current])
    setNotice({ key: "sent" })
  }

  return (
    <AdminLayout title={tAdmin("notifications")}>
      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t("compose.eyebrow")}</p>
          <h1 className="text-2xl font-bold text-card-foreground">{t("compose.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(`notice.${notice.key}`)}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <select className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>{t("recipients.byCourseCommunityParamedic")}</option>
              <option>{t("recipients.allActiveStudents")}</option>
              <option>{t("recipients.assessmentPendingStudents")}</option>
            </select>
            <div className="grid grid-cols-3 gap-2">
              {channels.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={() => setChannel(item.label)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${channel === item.label ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {getChannelLabel(item.label)}
                  </button>
                )
              })}
            </div>
          </div>

          <input value={subjectValue} onChange={(event) => setSubject(event.target.value)} aria-label={t("compose.subject")} className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
          <textarea value={messageValue} onChange={(event) => setMessage(event.target.value)} aria-label={t("compose.messageBody")} rows={8} className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_160px]">
            <input className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" type="datetime-local" />
            <button onClick={() => setNotice({ key: "scheduled" })} className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
              <Save className="h-4 w-4" />
              {t("actions.schedule")}
            </button>
            <button onClick={sendMessage} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              <Send className="h-4 w-4" />
              {t("actions.sendNow")}
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold text-card-foreground">{t("sent.title")}</h2>
            <div className="mt-3 divide-y divide-border">
              {sent.map((item, index) => (
                <div key={`${item.subject}-${index}`} className="grid grid-cols-[1fr_70px_60px] gap-3 py-3 text-sm">
                  <span className="font-medium">{getSubjectLabel(item.subject)}</span>
                  <span className="text-muted-foreground">{getChannelLabel(item.channel)}</span>
                  <span className="font-semibold text-green-700">{item.openRate}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold text-card-foreground">{t("rules.title")}</h2>
            <div className="mt-4 space-y-3">
              {rules.map((item, index) => (
                <label key={item.rule} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-sm font-medium">
                  <input value={getRuleLabel(item.rule)} onChange={(event) => setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, rule: event.target.value } : rule))} className="min-w-0 flex-1 bg-transparent outline-none" />
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
