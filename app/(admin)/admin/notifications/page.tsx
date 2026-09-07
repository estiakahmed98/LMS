"use client"

import { Suspense } from "react";
import NotificationsActionPage from "@/components/admin/NotificationsActionPage"

export default function NotificationsPage() {
  return <Suspense fallback={<p className="p-6">Loading notifications?</p>}><NotificationsActionPage /></Suspense>
}
