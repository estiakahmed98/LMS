"use client";

import UserDetailPage from "@/components/admin/UserDetailPage";
import { use } from "react";

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <UserDetailPage userId={id} />;
}
