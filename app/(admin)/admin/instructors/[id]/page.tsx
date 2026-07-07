"use client";

import InstructorDetailPage from "@/components/admin/InstructorDetailPage";
import { use } from "react";

export default function AdminInstructorDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <InstructorDetailPage instructorId={id} />;
}
