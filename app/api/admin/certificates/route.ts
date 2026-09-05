import { NextResponse } from "next/server";
import {
  bulkIssueCertificates,
} from "@/lib/admin-certificate-server";
import { listCertificateManagement, searchCertificateCourses } from "@/lib/admin-certificate-list-server";
import { parseCertificateFilters } from "@/lib/admin-certificate-list";
import type { CertificateEligibility } from "@/lib/admin-certificate-types";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const listHandler = async (request: Request) => {
  try {
    const params = new URL(request.url).searchParams;
    const headers = { "Cache-Control": "private, no-store" };
    if (params.get("options") === "1") {
      const q = (params.get("q") || "").trim();
      if (q.length > 100) return NextResponse.json({ error: "Course search is too long." }, { status: 400 });
      return NextResponse.json(await searchCertificateCourses(q), { headers });
    }
    let filters;
    try { filters = parseCertificateFilters(params); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    return NextResponse.json(await listCertificateManagement(filters), { headers });
  } catch (error) {
    console.error("ADMIN_CERTIFICATES_LIST_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load certificate management." },
      { status: 500 },
    );
  }
};

const bulkIssueHandler = async (request: Request) => {
  try {
    const body = (await request.json()) as {
      courseId?: string;
      eligibility?: CertificateEligibility;
      afterUserId?: string;
    };
    if (typeof body.courseId !== "string" || !body.courseId || body.courseId.length > 100 || (body.afterUserId !== undefined && (typeof body.afterUserId !== "string" || body.afterUserId.length > 100))) {
      return NextResponse.json(
        { error: "A valid course and continuation cursor are required." },
        { status: 400 },
      );
    }
    const result = await bulkIssueCertificates(
      body.courseId,
      body.eligibility ?? "COMPLETED",
      await getActorId(),
      body.afterUserId,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to issue certificates.",
      },
      { status: 400 },
    );
  }
};

export const GET = withPermission(
  PermissionModule.CERTIFICATES,
  "view",
  listHandler,
);
export const POST = withPermission(
  PermissionModule.CERTIFICATES,
  "create",
  bulkIssueHandler,
);
