import { NextResponse } from "next/server";
import {
  LearnerAuthError,
  requireLearner,
} from "@/lib/learner-auth-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { LearnerCertificateDetail } from "@/lib/learner-certificate-types";
import { unstable_cache } from "next/cache";

const getCachedCertificate = unstable_cache(
  async (id: string, userId: string) => prisma.certificate.findFirst({
    where: { id, userId, revokedAt: null },
    select: {
      id: true, courseId: true, certificateNumber: true, issueDate: true,
      issuerName: true, issuerCode: true, borderColor: true, fontFamily: true,
      directorSignatureUrl: true, officialSealUrl: true,
      course: { select: { id: true, title: true } },
      user: { select: { name: true, email: true } },
    },
  }),
  ["learner-certificate-detail-v1"],
  { revalidate: 300, tags: ["learner-data", "learner-certificates"] },
);

const getCachedCertificateScore = unstable_cache(
  async (userId: string, courseId: string) => prisma.submission.findFirst({
    where: { userId, status: "GRADED", assessment: { courseId }, obtainedMarks: { not: null } },
    orderBy: { submittedAt: "desc" },
    select: { obtainedMarks: true, assessment: { select: { totalMarks: true } } },
  }),
  ["learner-certificate-score-v1"],
  { revalidate: 300, tags: ["learner-data", "learner-certificates", "learner-results"] },
);

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

    const certificate = await getCachedCertificate(id, currentUser.id);

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found." },
        { status: 404 },
      );
    }

    const gradedSubmission = await getCachedCertificateScore(currentUser.id, certificate.courseId);

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
      template: {
        issuerName: certificate.issuerName,
        issuerCode: certificate.issuerCode,
        borderColor: certificate.borderColor,
        fontFamily: certificate.fontFamily as "SERIF_FORMAL" | "SANS_MODERN",
        directorSignatureUrl: certificate.directorSignatureUrl,
        officialSealUrl: certificate.officialSealUrl,
      },
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
