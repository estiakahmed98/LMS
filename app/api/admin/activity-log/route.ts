import { listActivity } from "@/lib/admin-activity-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

  const activity = await listActivity({
    entity: searchParams.get("entity") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    actorId: searchParams.get("actorId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    query: searchParams.get("query") ?? undefined,
    page,
    pageSize,
  });

  return NextResponse.json(activity);
}
