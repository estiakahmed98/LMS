"use client";

import AdminModuleDetailPage from "@/components/admin/AdminModuleDetailPage";
import { use } from "react";

export default function AdminModuleDetailRoute({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  const { id, moduleId } = use(params);
  return <AdminModuleDetailPage courseId={id} moduleId={moduleId} />;
}
