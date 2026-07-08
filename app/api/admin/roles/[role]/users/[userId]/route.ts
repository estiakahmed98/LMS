import {
  parseRoleParam,
  unassignUserFromRole,
} from "@/lib/admin-role-server";
import { getActorId } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ role: string; userId: string }> },
) {
  try {
    const { role, userId } = await params;
    const actorId = await getActorId();
    const detail = await unassignUserFromRole(userId, parseRoleParam(role), actorId);
    return NextResponse.json({ role: detail });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
