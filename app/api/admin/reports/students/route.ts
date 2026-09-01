import { NextResponse } from "next/server";
import { listStudentDirectory } from "@/lib/admin-report-server";
import type { AdminStudentDirectoryFilters } from "@/lib/admin-report-types";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const listStudentsHandler = async (request: Request) => {
  try {
    const params = new URL(request.url).searchParams;
    const int = (key: string) => {
      const value = params.get(key);
      return value ? Number(value) : undefined;
    };

    const filters: AdminStudentDirectoryFilters = {
      search: params.get("search") || undefined,
      courseId: params.get("courseId") || undefined,
      batchId: params.get("batchId") || undefined,
      page: int("page"),
      pageSize: int("pageSize"),
    };

    const result = await listStudentDirectory(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("ADMIN_REPORTS_STUDENTS_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load student reports." },
      { status: 500 },
    );
  }
};

export const GET = withPermission(
  PermissionModule.REPORTS,
  "view",
  listStudentsHandler,
);
