import {
  createClass,
  listClasses,
  normalizeClassPayload,
} from "@/lib/admin-class-server";
import { ClassScheduleConflictError } from "@/lib/class-schedule";
import { getActorId } from "@/lib/audit";
import type { AdminClassListFilters } from "@/lib/admin-class-types";
import { LiveClassStatus } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getClassesHandler = async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const int = (key: string) => {
    const value = params.get(key);
    return value ? Number(value) : undefined;
  };
  const status = params.get("status");

  const filters: AdminClassListFilters = {
    search: params.get("search") || undefined,
    status:
      status && Object.values(LiveClassStatus).includes(status as LiveClassStatus)
        ? (status as AdminClassListFilters["status"])
        : undefined,
    courseId: params.get("courseId") || undefined,
    instructorId: params.get("instructorId") || undefined,
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    page: int("page"),
    pageSize: int("pageSize"),
  };

  const result = await listClasses(filters);
  return NextResponse.json(result);
};

const createClassHandler = async (request: Request) => {
  try {
    const payload = normalizeClassPayload(await request.json());
    const actorId = await getActorId();
    const liveClass = await createClass(payload, actorId);
    return NextResponse.json({ class: liveClass }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withPermission(
  PermissionModule.COURSES,
  "view",
  getClassesHandler,
);
export const POST = withPermission(
  PermissionModule.COURSES,
  "create",
  createClassHandler,
);

function handleApiError(error: unknown) {
  if (error instanceof ClassScheduleConflictError) {
    return NextResponse.json(
      { error: error.message, fieldErrors: Object.fromEntries(error.fields.map((field) => [field,
        field === "courseId" ? "This cohort already has a class during the selected time."
          : field === "instructorId" ? "This instructor already has a class during the selected time."
            : "The selected date and time overlaps with another class. Please choose another time.",
      ])) },
      { status: 409 },
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A class with that unique value already exists." },
        { status: 409 },
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Selected course or instructor does not exist." },
        { status: 409 },
      );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
