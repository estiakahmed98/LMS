import { NextResponse } from "next/server";
import {
  LearnerAuthError,
  requireLearner,
} from "@/lib/learner-auth-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { LearnerCertificateDetail } from "@/lib/learner-certificate-types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = await requireLearner("/certificates", {
      module: PermissionModule.CERTIFICATES,
      action: "view",
    });

    const certificate = await prisma.certificate.findFirst({
      where: {
        id,
        userId: currentUser.id,
      },
      select: {
        id: true,
        courseId: true,
        certificateNumber: true,
        issueDate: true,
        course: { select: { id: true, title: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found." },
        { status: 404 },
      );
    }

    const gradedSubmission = await prisma.submission.findFirst({
      where: {
        userId: currentUser.id,
        status: "GRADED",
        assessment: { courseId: certificate.courseId },
        obtainedMarks: { not: null },
      },
      orderBy: { submittedAt: "desc" },
      select: {
        obtainedMarks: true,
        assessment: { select: { totalMarks: true } },
      },
    });

    const scorePercent =
      gradedSubmission?.obtainedMarks != null &&
      gradedSubmission.assessment.totalMarks > 0
        ? Math.round(
            (gradedSubmission.obtainedMarks /
              gradedSubmission.assessment.totalMarks) *
              100,
          )
        : null;

    const payload: LearnerCertificateDetail = {
      id: certificate.id,
      courseId: certificate.courseId,
      courseTitle: certificate.course.title,
      certificateNumber: certificate.certificateNumber,
      issueDate: certificate.issueDate.toISOString(),
      studentName: certificate.user.name,
      studentEmail: certificate.user.email,
      scorePercent,
    };

    return NextResponse.json({ certificate: payload });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("LEARNER_CERTIFICATE_DETAIL_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load certificate." },
      { status: 500 },
    );
  }
}
