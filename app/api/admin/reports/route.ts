import { getAdminReportsPayload } from "@/lib/admin-report-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const reportsHandler = async () => {
  try {
    return NextResponse.json(await getAdminReportsPayload());
  } catch (error) {
    console.error("ADMIN_REPORTS_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load reports." },
      { status: 500 },
    );
  }
};

export const GET = withPermission(
  PermissionModule.REPORTS,
  "view",
  reportsHandler,
);
