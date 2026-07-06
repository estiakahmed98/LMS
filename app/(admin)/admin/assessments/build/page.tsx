"use client"

import AssessmentBuilderCrudPage from "@/components/admin/AssessmentBuilderCrudPage"
import { Suspense } from "react"

export default function AssessmentBuilderPage() {
  return (
    <Suspense fallback={null}>
      <AssessmentBuilderCrudPage />
    </Suspense>
  )
}
