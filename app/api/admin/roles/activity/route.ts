import { listRoleActivity } from "@/lib/admin-role-server";
import { NextResponse } from "next/server";

export async function GET() {
  const activity = await listRoleActivity();
  return NextResponse.json({ activity });
}
