import { NextResponse } from "next/server";
import {
  LearnerAuthError,
  requireLearner,
} from "@/lib/learner-auth-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { LearnerCertificateSummary } from "@/lib/learner-certificate-types";

export async function GET() {
  try {
    const currentUser = await requireLearner("/certificates", {
      module: PermissionModule.CERTIFICATES,
      action: "view",
    });

    const certificates = await prisma.certificate.findMany({
      where: { userId: currentUser.id },
      select: {
        id: true,
        courseId: true,
        certificateNumber: true,
        issueDate: true,
        course: { select: { title: true } },
      },
      orderBy: { issueDate: "desc" },
    });

    const payload: LearnerCertificateSummary[] = certificates.map(
      (certificate) => ({
        id: certificate.id,
        courseId: certificate.courseId,
        courseTitle: certificate.course.title,
        certificateNumber: certificate.certificateNumber,
        issueDate: certificate.issueDate.toISOString(),
      }),
    );

    return NextResponse.json({ certificates: payload });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("LEARNER_CERTIFICATES_LIST_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load certificates." },
      { status: 500 },
    );
  }
}
