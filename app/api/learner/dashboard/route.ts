import { NextResponse } from "next/server";
import {
  LearnerAuthError,
  requireLearner,
} from "@/lib/learner-auth-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type {
  LearnerDashboardCourse,
  LearnerDashboardEnrollment,
  LearnerDashboardPayload,
} from "@/lib/learner-dashboard-types";
import { getRolePermissions } from "@/lib/rbac";
import { hasModulePermission } from "@/lib/rbac-permissions";

export async function GET() {
  try {
    const currentUser = await requireLearner("/dashboard");
    const permissions = await getRolePermissions(currentUser.role);
    const canViewAssessments = hasModulePermission(
      permissions,
      PermissionModule.ASSESSMENTS,
      "view",
    );
    const canViewCertificates = hasModulePermission(
      permissions,
      PermissionModule.CERTIFICATES,
      "view",
    );

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: currentUser.id,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            durationHours: true,
            coverImage: true,
            modules: {
              orderBy: {
                order: "asc",
              },
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: "desc",
      },
    });

    const approvedEnrollments = enrollments.filter(
      (enrollment) => enrollment.status === "APPROVED",
    );
    const approvedCourseIds = approvedEnrollments.map(
      (enrollment) => enrollment.courseId,
    );

    const uniqueApprovedCourseIds = [...new Set(approvedCourseIds)];

    const [submissions, certificates, notifications, assessments] =
      await Promise.all([
        canViewAssessments
          ? prisma.submission.findMany({
              where: {
                userId: currentUser.id,
              },
              select: {
                id: true,
                assessmentId: true,
                status: true,
                obtainedMarks: true,
                submittedAt: true,
                assessment: {
                  select: {
                    id: true,
                    title: true,
                    courseId: true,
                    course: {
                      select: {
                        title: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                updatedAt: "desc",
              },
            })
          : Promise.resolve([]),
        canViewCertificates
          ? prisma.certificate.findMany({
              where: {
                userId: currentUser.id,
              },
              select: {
                id: true,
                courseId: true,
                certificateNumber: true,
                issueDate: true,
                course: {
                  select: {
                    title: true,
                  },
                },
              },
              orderBy: {
                issueDate: "desc",
              },
            })
          : Promise.resolve([]),
        prisma.notification.findMany({
          where: {
            userId: currentUser.id,
          },
          select: {
            id: true,
            title: true,
            message: true,
            type: true,
            readAt: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 4,
        }),
        canViewAssessments && uniqueApprovedCourseIds.length
          ? prisma.assessment.findMany({
              where: {
                courseId: {
                  in: uniqueApprovedCourseIds,
                },
              },
              select: {
                id: true,
                courseId: true,
              },
            })
          : Promise.resolve<Array<{ id: string; courseId: string }>>([]),
      ]);

    const nonDraftSubmissionIds = new Set(
      submissions
        .filter((submission) => submission.status !== "DRAFT")
        .map((submission) => submission.assessmentId),
    );

    const pendingAssessments = canViewAssessments
      ? assessments.filter(
          (assessment) => !nonDraftSubmissionIds.has(assessment.id),
        ).length
      : 0;

    const enrollmentCount = enrollments.length;
    const completedCount = enrollments.filter(
      (enrollment) => enrollment.progress === 100,
    ).length;
    const inProgressCount = enrollments.filter(
      (enrollment) => enrollment.progress > 0 && enrollment.progress < 100,
    ).length;
    const notStartedCount = enrollments.filter(
      (enrollment) => enrollment.progress === 0,
    ).length;
    const avgProgress = enrollmentCount
      ? Math.round(
          enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) /
            enrollmentCount,
        )
      : 0;

    const certificateByCourseId = new Map(
      certificates.map((certificate) => [certificate.courseId, certificate]),
    );

    const serializedEnrollments: LearnerDashboardEnrollment[] = enrollments.map(
      (enrollment) => {
        const course: LearnerDashboardCourse = {
          id: enrollment.course.id,
          title: enrollment.course.title,
          description: enrollment.course.description,
          durationHours: enrollment.course.durationHours,
          coverImage: enrollment.course.coverImage,
          modules: enrollment.course.modules.map((module) => ({
            id: module.id,
            title: module.title,
          })),
        };

        const certificate = canViewCertificates
          ? certificateByCourseId.get(enrollment.course.id)
          : undefined;

        return {
          id: enrollment.id,
          status: enrollment.status,
          progress: enrollment.progress,
          enrolledAt: enrollment.enrolledAt.toISOString(),
          completedAt: enrollment.completedAt?.toISOString() ?? null,
          course,
          certificate: certificate
            ? {
                id: certificate.id,
                certificateNumber: certificate.certificateNumber,
              }
            : null,
        };
      },
    );

    const payload: LearnerDashboardPayload = {
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      },
      enrollments: serializedEnrollments,
      certificates: certificates.map((certificate) => ({
        id: certificate.id,
        courseId: certificate.courseId,
        courseTitle: certificate.course.title,
        certificateNumber: certificate.certificateNumber,
        issueDate: certificate.issueDate.toISOString(),
      })),
      submissions: submissions.map((submission) => ({
        id: submission.id,
        assessmentId: submission.assessmentId,
        assessmentTitle: submission.assessment.title,
        courseId: submission.assessment.courseId,
        courseTitle: submission.assessment.course.title,
        status: submission.status,
        obtainedMarks: submission.obtainedMarks ?? null,
        submittedAt: submission.submittedAt?.toISOString() ?? null,
      })),
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        readAt: notification.readAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString(),
      })),
      summary: {
        enrollmentCount,
        approvedEnrollmentCount: approvedEnrollments.length,
        completedCount,
        inProgressCount,
        notStartedCount,
        avgProgress,
        pendingAssessments,
        certificateCount: certificates.length,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("LEARNER_DASHBOARD_ERROR", error);

    return NextResponse.json(
      { error: "Failed to load learner dashboard." },
      { status: 500 },
    );
  }
}
