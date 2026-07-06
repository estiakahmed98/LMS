"use client";

import StudentDetailPage from "@/components/admin/StudentDetailPage";
import { use } from "react";

export default function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StudentDetailPage studentId={id} />;
}
