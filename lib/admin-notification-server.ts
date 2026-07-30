import { auditLogEntry } from "@/lib/audit";
import {
  NotificationAudienceType,
  NotificationType,
  Role,
} from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type {
  AdminNotificationData,
  CreateNotificationCampaignInput,
  NotificationAudienceValue,
  NotificationCampaignListItem,
} from "@/lib/admin-notification-types";

const ACTIVE_STUDENT_STATUSES = ["APPROVED", "ACTIVE"] as const;
const COMPLETED_SUBMISSION_STATUSES = [
  "SUBMITTED",
  "GRADING",
  "GRADED",
  "REVIEWED",
] as const;
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_ACTION_URL_LENGTH = 500;

export class NotificationCampaignError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "NotificationCampaignError";
  }
}

function audienceLabel(
  audienceType: NotificationAudienceValue,
  courseTitle?: string | null,
  assessmentTitle?: string | null,
) {
  if (audienceType === "COURSE_STUDENTS") {
    return courseTitle ? `Course: ${courseTitle}` : "Course students";
  }
  if (audienceType === "ASSESSMENT_PENDING_STUDENTS") {
    return assessmentTitle
      ? `Pending: ${assessmentTitle}`
      : "Assessment pending students";
  }
  return "All active students";
}

export async function listAdminNotificationData(): Promise<AdminNotificationData> {
  const [
    campaigns,
    campaignCount,
    courses,
    assessments,
    allActiveStudents,
    deliveryTotals,
  ] = await Promise.all([
    prisma.notificationCampaign.findMany({
      orderBy: { sentAt: "desc" },
      take: 50,
      include: {
        course: { select: { title: true } },
        assessment: { select: { title: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.notificationCampaign.count(),
    prisma.course.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            enrollments: {
              where: {
                status: "APPROVED",
                user: {
                  role: Role.STUDENT,
                  status: { in: [...ACTIVE_STUDENT_STATUSES] },
                },
              },
            },
          },
        },
      },
    }),
    prisma.assessment.findMany({
      orderBy: [{ course: { title: "asc" } }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        course: {
          select: {
            title: true,
            enrollments: {
              where: {
                status: "APPROVED",
                user: {
                  role: Role.STUDENT,
                  status: { in: [...ACTIVE_STUDENT_STATUSES] },
                },
              },
              select: { userId: true },
            },
          },
        },
        submissions: {
          where: { status: { in: [...COMPLETED_SUBMISSION_STATUSES] } },
          select: { userId: true },
        },
      },
    }),
    prisma.user.count({
      where: {
        role: Role.STUDENT,
        status: { in: [...ACTIVE_STUDENT_STATUSES] },
      },
    }),
    prisma.notification.aggregate({
      where: { campaignId: { not: null } },
      _count: { _all: true, readAt: true },
    }),
  ]);

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const readGroups = campaignIds.length
    ? await prisma.notification.groupBy({
        by: ["campaignId"],
        where: {
          campaignId: { in: campaignIds },
          readAt: { not: null },
        },
        _count: { _all: true },
      })
    : [];
  const readByCampaign = new Map(
    readGroups.map((group) => [group.campaignId, group._count._all]),
  );

  const serializedCampaigns: NotificationCampaignListItem[] = campaigns.map(
    (campaign) => {
      const readCount = readByCampaign.get(campaign.id) ?? 0;
      return {
        id: campaign.id,
        subject: campaign.subject,
        message: campaign.message,
        type: campaign.type,
        audienceType: campaign.audienceType,
        audienceLabel: audienceLabel(
          campaign.audienceType,
          campaign.course?.title,
          campaign.assessment?.title,
        ),
        actionUrl: campaign.actionUrl,
        recipientCount: campaign.recipientCount,
        readCount,
        unreadCount: Math.max(0, campaign.recipientCount - readCount),
        readRate:
          campaign.recipientCount === 0
            ? 0
            : Math.round((readCount / campaign.recipientCount) * 100),
        sentAt: campaign.sentAt.toISOString(),
        createdBy:
          campaign.createdBy?.name ??
          campaign.createdBy?.email ??
          "Deleted administrator",
      };
    },
  );

  const delivered = deliveryTotals._count._all;
  const read = deliveryTotals._count.readAt;

  return {
    campaigns: serializedCampaigns,
    audiences: {
      allActiveStudents,
      courses: courses.map((course) => ({
        id: course.id,
        label: course.title,
        learnerCount: course._count.enrollments,
      })),
      assessments: assessments.map((assessment) => {
        const completed = new Set(
          assessment.submissions.map((submission) => submission.userId),
        );
        return {
          id: assessment.id,
          label: assessment.title,
          courseTitle: assessment.course.title,
          learnerCount: assessment.course.enrollments.reduce(
            (count, enrollment) =>
              count + (completed.has(enrollment.userId) ? 0 : 1),
            0,
          ),
        };
      }),
    },
    totals: {
      campaigns: campaignCount,
      delivered,
      read,
      unread: Math.max(0, delivered - read),
    },
  };
}

function normalizeInput(raw: CreateNotificationCampaignInput) {
  const subject = raw.subject?.trim();
  const message = raw.message?.trim();
  const actionUrl = raw.actionUrl?.trim() || null;

  if (!subject || !message) {
    throw new NotificationCampaignError("Subject and message are required.");
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    throw new NotificationCampaignError(
      `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.`,
    );
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new NotificationCampaignError(
      `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    );
  }
  if (
    actionUrl &&
    (!actionUrl.startsWith("/") ||
      actionUrl.startsWith("//") ||
      actionUrl.length > MAX_ACTION_URL_LENGTH)
  ) {
    throw new NotificationCampaignError(
      "Action URL must be an internal path beginning with /.",
    );
  }
  if (!Object.values(NotificationType).includes(raw.type as NotificationType)) {
    throw new NotificationCampaignError("Invalid notification type.");
  }
  if (
    !Object.values(NotificationAudienceType).includes(
      raw.audienceType as NotificationAudienceType,
    )
  ) {
    throw new NotificationCampaignError("Invalid notification audience.");
  }

  return {
    subject,
    message,
    actionUrl,
    type: raw.type as NotificationType,
    audienceType: raw.audienceType as NotificationAudienceType,
    courseId: raw.courseId?.trim() || null,
    assessmentId: raw.assessmentId?.trim() || null,
  };
}

async function resolveRecipients(input: ReturnType<typeof normalizeInput>) {
  if (input.audienceType === NotificationAudienceType.COURSE_STUDENTS) {
    if (!input.courseId) {
      throw new NotificationCampaignError("Select a course.");
    }
    const course = await prisma.course.findUnique({
      where: { id: input.courseId },
      select: {
        id: true,
        enrollments: {
          where: {
            status: "APPROVED",
            user: {
              role: Role.STUDENT,
              status: { in: [...ACTIVE_STUDENT_STATUSES] },
            },
          },
          select: { userId: true },
        },
      },
    });
    if (!course) {
      throw new NotificationCampaignError("Selected course was not found.", 404);
    }
    return course.enrollments.map((enrollment) => enrollment.userId);
  }

  if (
    input.audienceType ===
    NotificationAudienceType.ASSESSMENT_PENDING_STUDENTS
  ) {
    if (!input.assessmentId) {
      throw new NotificationCampaignError("Select an assessment.");
    }
    const assessment = await prisma.assessment.findUnique({
      where: { id: input.assessmentId },
      select: {
        id: true,
        course: {
          select: {
            enrollments: {
              where: {
                status: "APPROVED",
                user: {
                  role: Role.STUDENT,
                  status: { in: [...ACTIVE_STUDENT_STATUSES] },
                },
              },
              select: { userId: true },
            },
          },
        },
        submissions: {
          where: { status: { in: [...COMPLETED_SUBMISSION_STATUSES] } },
          select: { userId: true },
        },
      },
    });
    if (!assessment) {
      throw new NotificationCampaignError(
        "Selected assessment was not found.",
        404,
      );
    }
    const completed = new Set(
      assessment.submissions.map((submission) => submission.userId),
    );
    return assessment.course.enrollments
      .map((enrollment) => enrollment.userId)
      .filter((userId) => !completed.has(userId));
  }

  const users = await prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      status: { in: [...ACTIVE_STUDENT_STATUSES] },
    },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

export async function createNotificationCampaign(
  raw: CreateNotificationCampaignInput,
  actorId: string,
) {
  const input = normalizeInput(raw);
  const recipientIds = [...new Set(await resolveRecipients(input))];

  if (recipientIds.length === 0) {
    throw new NotificationCampaignError(
      "The selected audience has no eligible learners.",
    );
  }

  const sentAt = new Date();
  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.notificationCampaign.create({
      data: {
        subject: input.subject,
        message: input.message,
        type: input.type,
        audienceType: input.audienceType,
        courseId:
          input.audienceType === NotificationAudienceType.COURSE_STUDENTS
            ? input.courseId
            : null,
        assessmentId:
          input.audienceType ===
          NotificationAudienceType.ASSESSMENT_PENDING_STUDENTS
            ? input.assessmentId
            : null,
        actionUrl: input.actionUrl,
        recipientCount: recipientIds.length,
        createdById: actorId,
        sentAt,
      },
    });

    for (let index = 0; index < recipientIds.length; index += 1_000) {
      const chunk = recipientIds.slice(index, index + 1_000);
      await tx.notification.createMany({
        data: chunk.map((userId) => ({
          userId,
          campaignId: created.id,
          title: input.subject,
          message: input.message,
          type: input.type,
          actionUrl: input.actionUrl,
          createdAt: sentAt,
        })),
      });
    }
    return created;
  });

  await auditLogEntry({
    actorId,
    action: "notification.campaign.sent",
    entity: "NotificationCampaign",
    entityId: campaign.id,
    changes: {
      audienceType: input.audienceType,
      courseId: campaign.courseId,
      assessmentId: campaign.assessmentId,
      recipientCount: campaign.recipientCount,
      notificationType: input.type,
      actionUrl: input.actionUrl,
    },
  });

  return {
    id: campaign.id,
    recipientCount: campaign.recipientCount,
    sentAt: campaign.sentAt.toISOString(),
  };
}
