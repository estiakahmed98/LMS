import { getActivityActorProfile } from "@/lib/admin-activity-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getActorProfileHandler = async (
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) => {
  const { userId } = await params;
  const actor = await getActivityActorProfile(userId);
  if (!actor) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ actor }, { headers: { "Cache-Control": "no-store" } });
};

export const GET = withPermission(
  PermissionModule.ROLES,
  "view",
  getActorProfileHandler,
);
