import { listRoleSummaries } from "@/lib/admin-role-server";
import { NextResponse } from "next/server";

export async function GET() {
  const roles = await listRoleSummaries();
  return NextResponse.json({ roles });
}
