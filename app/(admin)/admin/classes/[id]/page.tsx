"use client";

import ClassDetailPage from "@/components/admin/ClassDetailPage";
import { use } from "react";

export default function AdminClassDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ClassDetailPage classId={id} />;
}
