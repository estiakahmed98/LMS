// Admin/super-admin driven user management - this is the ONLY place
// staff/instructor accounts get created. The public /api/signup route
// only ever creates STUDENT accounts.
import { prisma } from "@/lib/prisma";
import { auditLogEntry } from "@/lib/audit";
import { hashPassword } from "@/lib/security/password";
import { encryptOptional, decryptOptional } from "@/lib/security/encryption";
import type {
  AdminUserCreatePayload,
  AdminUserDetail,
  AdminUserEnrollmentUpdatePayload,
  AdminUserStatusUpdatePayload,
  AdminUserSummary,
  AdminUserUpdatePayload,
  UserRoleValue,
  UserStatusValue,
} from "@/lib/admin-user-types";
import { Prisma } from "@/lib/generated/prisma/client";

const roleValues: UserRoleValue[] = [
  "SUPER_ADMIN",
  "COURSE_MANAGER",
  "EXAMINER",
  "REPORT_VIEWER",
  "INSTRUCTOR",
  "STUDENT",
];

const statusValues: UserStatusValue[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "ACTIVE",
  "INACTIVE",
];

const enrollmentStatusValues = ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"] as const;

const userSummaryInclude = {
  enrollments: {
    select: {
      id: true,
      status: true,
      progress: true,
      enrolledAt: true,
      completedAt: true,
      course: { select: { id: true, title: true } },
    },
  },
  liveClasses: { select: { course: { select: { id: true, title: true } } } },
  profile: true,
} satisfies Prisma.UserInclude;

const userDetailInclude = {
  enrollments: {
    select: {
      id: true,
      status: true,
      progress: true,
      enrolledAt: true,
      completedAt: true,
      course: { select: { id: true, title: true } },
    },
  },
  liveClasses: {
    include: {
      course: { select: { id: true, title: true } },
      sessions: {
        include: { _count: { select: { attendances: true } } },
        orderBy: { scheduledStart: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  },
  profile: true,
  submissions: {
    include: {
      assessment: {
        include: { course: { select: { id: true, title: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  },
  certificates: {
    include: { course: { select: { id: true, title: true } } },
    orderBy: { issueDate: "desc" },
  },
  notifications: {
    orderBy: { createdAt: "desc" },
  },
  auditLogs: {
    orderBy: { createdAt: "desc" },
    take: 50,
  },
  videoProgress: {
    include: {
      module: {
        include: { course: { select: { id: true, title: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  },
  attendances: {
    include: {
      session: {
        include: {
          liveClass: {
            include: { course: { select: { id: true, title: true } } },
          },
        },
      },
    },
    orderBy: { joinTime: "desc" },
  },
} satisfies Prisma.UserInclude;

function serializeUser(
  user:
    | Prisma.UserGetPayload<{ include: typeof userSummaryInclude }>
    | Prisma.UserGetPayload<{ include: typeof userDetailInclude }>,
): AdminUserSummary {
  const courseMap = new Map<string, string>();
  for (const enrollment of user.enrollments) {
    courseMap.set(enrollment.course.id, enrollment.course.title);
  }
  for (const liveClass of user.liveClasses) {
    courseMap.set(liveClass.course.id, liveClass.course.title);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastActive: user.lastActive ? user.lastActive.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    enrollmentCount: user.enrollments.length,
    courses: Array.from(courseMap, ([id, title]) => ({ id, title })),
  };
}

function serializeUserDetail(
  user: Prisma.UserGetPayload<{ include: typeof userDetailInclude }>,
): AdminUserDetail {
  return {
    ...serializeUser(user),
    phone: decryptOptional(user.phoneEnc),
    photoUrl: user.photoUrl,
    hasPassword: Boolean(user.passwordHash),
    profile: {
      dateOfBirth: user.profile?.dateOfBirth
        ? user.profile.dateOfBirth.toISOString()
        : null,
      nidNumber: decryptOptional(user.profile?.nidNumberEnc),
      address: user.profile?.address ?? null,
      city: user.profile?.city ?? null,
      postalCode: user.profile?.postalCode ?? null,
    },
    enrollments: user.enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      courseId: enrollment.course.id,
      courseTitle: enrollment.course.title,
      status: enrollment.status,
      progress: enrollment.progress,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      completedAt: enrollment.completedAt ? enrollment.completedAt.toISOString() : null,
    })),
    submissions: user.submissions.map((submission) => ({
      id: submission.id,
      assessmentId: submission.assessmentId,
      assessmentTitle: submission.assessment.title,
      courseId: submission.assessment.course.id,
      courseTitle: submission.assessment.course.title,
      status: submission.status,
      obtainedMarks: submission.obtainedMarks,
      totalMarks: submission.assessment.totalMarks,
      submittedAt: submission.submittedAt ? submission.submittedAt.toISOString() : null,
      gradedAt: submission.gradedAt ? submission.gradedAt.toISOString() : null,
      answerSheetUrls: submission.answerSheetUrls,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
    })),
    certificates: user.certificates.map((certificate) => ({
      id: certificate.id,
      courseId: certificate.courseId,
      courseTitle: certificate.course.title,
      certificateNumber: certificate.certificateNumber,
      issueDate: certificate.issueDate.toISOString(),
      createdAt: certificate.createdAt.toISOString(),
    })),
    notifications: user.notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
      createdAt: notification.createdAt.toISOString(),
    })),
    auditLogs: user.auditLogs.map((auditLog) => ({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      changes: auditLog.changes,
      createdAt: auditLog.createdAt.toISOString(),
    })),
    videoProgress: user.videoProgress.map((progress) => ({
      id: progress.id,
      moduleId: progress.moduleId,
      moduleTitle: progress.module.title,
      courseId: progress.module.course.id,
      courseTitle: progress.module.course.title,
      positionSeconds: progress.positionSeconds,
      durationSeconds: progress.durationSeconds,
      watchedPercent: progress.watchedPercent,
      completed: progress.completed,
      updatedAt: progress.updatedAt.toISOString(),
    })),
    liveClasses: user.liveClasses.map((liveClass) => ({
      id: liveClass.id,
      title: liveClass.title,
      courseId: liveClass.courseId,
      courseTitle: liveClass.course.title,
      subjectName: liveClass.subjectName,
      batchName: liveClass.batchName,
      status: liveClass.status,
      meetingType: liveClass.meetingType,
      recurrence: liveClass.recurrence,
      durationMinutes: liveClass.durationMinutes,
      meetingLink: liveClass.meetingLink,
      waitingRoomEnabled: liveClass.waitingRoomEnabled,
      recordingEnabled: liveClass.recordingEnabled,
      autoAttendanceEnabled: liveClass.autoAttendanceEnabled,
      createdAt: liveClass.createdAt.toISOString(),
      updatedAt: liveClass.updatedAt.toISOString(),
      sessions: liveClass.sessions.map((session) => ({
        id: session.id,
        scheduledStart: session.scheduledStart.toISOString(),
        scheduledEnd: session.scheduledEnd.toISOString(),
        actualStart: session.actualStart ? session.actualStart.toISOString() : null,
        actualEnd: session.actualEnd ? session.actualEnd.toISOString() : null,
        status: session.status,
        recordingUrl: session.recordingUrl,
        recordingSizeMb: session.recordingSizeMb,
        attendanceCount: session._count.attendances,
      })),
    })),
    attendances: user.attendances.map((attendance) => ({
      id: attendance.id,
      status: attendance.status,
      joinTime: attendance.joinTime ? attendance.joinTime.toISOString() : null,
      leaveTime: attendance.leaveTime ? attendance.leaveTime.toISOString() : null,
      durationMinutes: attendance.durationMinutes,
      speakTimeSeconds: attendance.speakTimeSeconds,
      sessionId: attendance.sessionId,
      scheduledStart: attendance.session.scheduledStart.toISOString(),
      scheduledEnd: attendance.session.scheduledEnd.toISOString(),
      sessionStatus: attendance.session.status,
      liveClassId: attendance.session.liveClass.id,
      liveClassTitle: attendance.session.liveClass.title,
      courseId: attendance.session.liveClass.course.id,
      courseTitle: attendance.session.liveClass.course.title,
    })),
  };
}

export function normalizeUserCreatePayload(input: unknown): AdminUserCreatePayload {
  const payload = (input ?? {}) as Partial<AdminUserCreatePayload>;
  const role = String(payload.role ?? "").toUpperCase();

  if (!payload.name?.trim()) throw new Error("Name is required.");
  if (!payload.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("A valid email is required.");
  }
  if (!payload.password || payload.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!roleValues.includes(role as UserRoleValue)) {
    throw new Error("Invalid role.");
  }

  return {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    role: role as UserRoleValue,
    phone: payload.phone?.trim() || undefined,
  };
}

export function normalizeStatusUpdatePayload(
  input: unknown,
): AdminUserStatusUpdatePayload {
  const payload = (input ?? {}) as Partial<AdminUserStatusUpdatePayload>;
  const status = String(payload.status ?? "").toUpperCase();

  if (!statusValues.includes(status as UserStatusValue)) {
    throw new Error("Invalid status.");
  }

  return { status: status as UserStatusValue };
}

export function normalizeUserUpdatePayload(input: unknown): AdminUserUpdatePayload {
  const payload = (input ?? {}) as Partial<AdminUserUpdatePayload>;
  const role = String(payload.role ?? "").toUpperCase();

  if (!payload.name?.trim()) throw new Error("Name is required.");
  if (!payload.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("A valid email is required.");
  }
  if (!roleValues.includes(role as UserRoleValue)) {
    throw new Error("Invalid role.");
  }
  if (payload.status && !statusValues.includes(String(payload.status).toUpperCase() as UserStatusValue)) {
    throw new Error("Invalid status.");
  }
  if (payload.dateOfBirth && Number.isNaN(Date.parse(payload.dateOfBirth))) {
    throw new Error("Invalid date of birth.");
  }
  if (payload.password !== undefined && payload.password && payload.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  return {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    role: role as UserRoleValue,
    status: payload.status
      ? (String(payload.status).toUpperCase() as UserStatusValue)
      : undefined,
    phone: payload.phone?.trim() || undefined,
    photoUrl: payload.photoUrl?.trim() || null,
    dateOfBirth: payload.dateOfBirth?.trim() || null,
    nidNumber: payload.nidNumber?.trim() || undefined,
    address: payload.address?.trim() || undefined,
    city: payload.city?.trim() || undefined,
    postalCode: payload.postalCode?.trim() || undefined,
    password: payload.password || undefined,
  };
}

export function normalizeEnrollmentUpdatePayload(
  input: unknown,
): AdminUserEnrollmentUpdatePayload {
  const payload = (input ?? {}) as Partial<AdminUserEnrollmentUpdatePayload>;
  const status = String(payload.status ?? "").toUpperCase();
  const progress = Number(payload.progress ?? 0);

  if (!enrollmentStatusValues.includes(status as (typeof enrollmentStatusValues)[number])) {
    throw new Error("Invalid enrollment status.");
  }
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    throw new Error("Progress must be between 0 and 100.");
  }
  if (payload.completedAt && Number.isNaN(Date.parse(payload.completedAt))) {
    throw new Error("Invalid completion date.");
  }

  return {
    status: status as AdminUserEnrollmentUpdatePayload["status"],
    progress: Math.round(progress),
    completedAt: payload.completedAt?.trim() || null,
  };
}

export async function listUsers(role?: UserRoleValue, courseId?: string) {
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(courseId
        ? {
            OR: [
              { enrollments: { some: { courseId } } },
              { liveClasses: { some: { courseId } } },
            ],
          }
        : {}),
    },
    include: userSummaryInclude,
    orderBy: { createdAt: "desc" },
  });

  return users.map(serializeUser);
}

export async function createUser(
  payload: AdminUserCreatePayload,
  actorId: string | null = null,
) {
  const passwordHash = await hashPassword(payload.password);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: payload.role,
      status: payload.role === "STUDENT" ? "PENDING" : "ACTIVE",
      phoneEnc: encryptOptional(payload.phone),
    },
    include: userSummaryInclude,
  });

  await auditLogEntry({
    actorId,
    action: "user.created",
    entity: "User",
    entityId: user.id,
    changes: { name: payload.name, email: payload.email, role: payload.role },
  });

  return serializeUser(user);
}

export async function updateUserStatus(
  userId: string,
  status: UserStatusValue,
  actorId: string | null = null,
) {
  const previous = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
    include: userSummaryInclude,
  });

  await auditLogEntry({
    actorId,
    action: "user.statusUpdated",
    entity: "User",
    entityId: user.id,
    changes: { from: previous?.status ?? null, to: status },
  });

  return serializeUser(user);
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userDetailInclude,
  });

  return user ? serializeUserDetail(user) : null;
}

export async function updateUser(
  userId: string,
  payload: AdminUserUpdatePayload,
  actorId: string | null = null,
) {
  const passwordHash = payload.password ? await hashPassword(payload.password) : undefined;
  const hasProfileFields =
    payload.dateOfBirth !== undefined ||
    payload.nidNumber !== undefined ||
    payload.address !== undefined ||
    payload.city !== undefined ||
    payload.postalCode !== undefined;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      ...(payload.status ? { status: payload.status } : {}),
      phoneEnc: encryptOptional(payload.phone),
      photoUrl: payload.photoUrl ?? undefined,
      ...(passwordHash ? { passwordHash } : {}),
      ...(hasProfileFields
        ? {
            profile: {
              upsert: {
                create: {
                  dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
                  nidNumberEnc: encryptOptional(payload.nidNumber),
                  address: payload.address || null,
                  city: payload.city || null,
                  postalCode: payload.postalCode || null,
                },
                update: {
                  dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
                  nidNumberEnc: encryptOptional(payload.nidNumber),
                  address: payload.address || null,
                  city: payload.city || null,
                  postalCode: payload.postalCode || null,
                },
              },
            },
          }
        : {}),
    },
    include: userDetailInclude,
  });

  await auditLogEntry({
    actorId,
    action: "user.updated",
    entity: "User",
    entityId: user.id,
    changes: {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      passwordChanged: Boolean(passwordHash),
    },
  });

  return serializeUserDetail(user);
}

export async function updateUserEnrollment(
  userId: string,
  enrollmentId: string,
  payload: AdminUserEnrollmentUpdatePayload,
  actorId: string | null = null,
) {
  const enrollment = await prisma.enrollment.update({
    where: { id: enrollmentId, userId },
    data: {
      status: payload.status,
      progress: payload.progress,
      completedAt: payload.completedAt ? new Date(payload.completedAt) : null,
    },
  });

  await auditLogEntry({
    actorId,
    action: "user.enrollmentUpdated",
    entity: "Enrollment",
    entityId: enrollment.id,
    changes: {
      userId,
      status: payload.status,
      progress: payload.progress,
      completedAt: payload.completedAt,
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: userDetailInclude,
  });

  return serializeUserDetail(user);
}

export async function deleteUser(userId: string, actorId: string | null = null) {
  await prisma.user.delete({ where: { id: userId } });

  await auditLogEntry({
    actorId,
    action: "user.deleted",
    entity: "User",
    entityId: userId,
  });
}

export async function enrollUserInCourse(
  userId: string,
  courseId: string,
  actorId: string | null = null,
) {
  const enrollment = await prisma.enrollment.create({
    data: { userId, courseId, status: "APPROVED" },
  });

  await auditLogEntry({
    actorId,
    action: "user.enrolled",
    entity: "Enrollment",
    entityId: enrollment.id,
    changes: { userId, courseId },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: userDetailInclude,
  });

  return serializeUserDetail(user);
}

export async function unenrollUserFromCourse(
  userId: string,
  enrollmentId: string,
  actorId: string | null = null,
) {
  await prisma.enrollment.delete({
    where: { id: enrollmentId, userId },
  });

  await auditLogEntry({
    actorId,
    action: "user.unenrolled",
    entity: "Enrollment",
    entityId: enrollmentId,
    changes: { userId },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: userDetailInclude,
  });

  return serializeUserDetail(user);
}
