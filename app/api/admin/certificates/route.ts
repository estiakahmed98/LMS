import { NextResponse } from "next/server";
import {
  bulkIssueCertificates,
  listCertificateManagement,
} from "@/lib/admin-certificate-server";
import type { CertificateEligibility } from "@/lib/admin-certificate-types";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const listHandler = async () => {
  try {
    return NextResponse.json(await listCertificateManagement());
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
    };
    if (!body.courseId) {
      return NextResponse.json(
        { error: "Course is required." },
        { status: 400 },
      );
    }
    const result = await bulkIssueCertificates(
      body.courseId,
      body.eligibility ?? "COMPLETED",
      await getActorId(),
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
