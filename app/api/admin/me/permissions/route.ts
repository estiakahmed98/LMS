import { NextResponse } from "next/server";
import { getAdminPermissions, RbacError } from "@/lib/rbac";

export async function GET() {
  try {
    const { user, permissions } = await getAdminPermissions();
    return NextResponse.json({
      role: user.role,
      permissions,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("ADMIN_PERMISSIONS_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load permissions." },
      { status: 500 },
    );
  }
}
