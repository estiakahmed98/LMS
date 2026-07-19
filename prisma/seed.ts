import "dotenv/config";
import {
  PrismaClient,
  Role,
  PermissionModule,
} from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  mockUsers,
  mockCourses,
  mockModules,
  mockEnrollments,
  mockAssessments,
  mockQuestions,
  mockSubmissions,
  mockCertificates,
  mockNotifications,
  mockAuditLogs,
  mockLiveClasses,
  mockLiveClassSessions,
  mockLiveClassAttendance,
  mockLiveChatMessages,
} from "../lib/mock-data";
import { courseRecords, permissionModules } from "../lib/admin-panel-data";
import { hashPassword } from "../lib/security/password";
import { encryptOptional } from "../lib/security/encryption";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

const statusMap: Record<string, "PUBLISHED" | "DRAFT" | "ARCHIVED"> = {
  Published: "PUBLISHED",
  Draft: "DRAFT",
  Archived: "ARCHIVED",
};

const permissionModuleMap: Record<string, PermissionModule> = {
  Students: "STUDENTS",
  Courses: "COURSES",
  Assessments: "ASSESSMENTS",
  "Question Bank": "QUESTION_BANK",
  Submissions: "SUBMISSIONS",
  Grading: "GRADING",
  Certificates: "CERTIFICATES",
  Reports: "REPORTS",
  Settings: "SETTINGS",
  Roles: "ROLES",
};

function parseMinutes(duration: string): number {
  const match = duration.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Categories are created on the fly from whatever names appear in the mock
// course data — no fixed list, so a brand-new category needs no schema change.
async function upsertCategory(name: string) {
  const slug = slugify(name);
  return prisma.category.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

const seededRoles: Role[] = ["SUPER_ADMIN", "STUDENT", "INSTRUCTOR"];

async function seedUsers() {
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hashPassword(defaultPassword);

  const users = mockUsers.filter((user) => seededRoles.includes(user.role));

  for (const user of users) {
    const data = {
      name: user.name,
      email: user.email,
      phoneEnc: encryptOptional(user.phone),
      passwordHash,
      role: user.role,
      status: user.status,
      lastActive: user.lastActive,
      createdAt: user.createdAt,
    };
    await prisma.user.upsert({
      where: { id: user.id },
      update: data,
      create: { id: user.id, ...data },
    });
  }
  console.log(
    `  users: ${users.length} (default password: "${defaultPassword}")`,
  );
}

async function seedCourses() {
  // Canonical courses from mock-data, enriched with presentation fields
  // from admin-panel-data where the titles match exactly.
  const recordByTitle = new Map(courseRecords.map((r) => [r.title, r]));

  for (const course of mockCourses) {
    const record = recordByTitle.get(course.title);
    const category = record ? await upsertCategory(record.category) : null;
    const data = {
      title: course.title,
      description: course.description,
      durationHours: course.duration,
      level: course.level,
      categoryId: category?.id ?? null,
      status: record ? statusMap[record.status] : ("PUBLISHED" as const),
      coverImage: record?.coverImage ?? null,
      createdAt: course.createdAt,
    };
    await prisma.course.upsert({
      where: { id: course.id },
      update: data,
      create: { id: course.id, ...data },
    });
  }

  for (const module of mockModules) {
    const data = {
      courseId: module.courseId,
      title: module.title,
      order: module.order,
      type: module.type,
      durationMinutes: module.duration,
    };
    await prisma.module.upsert({
      where: { id: module.id },
      update: data,
      create: { id: module.id, ...data },
    });
  }
  console.log(
    `  courses: ${mockCourses.length}, modules: ${mockModules.length}`,
  );

  // Admin-panel courses that don't exist in mock-data ("Public Health
  // Essentials", "Trauma Response Basics") — created with their full module
  // content (cover images, overviews, notes, resources, quizzes).
  const mockTitles = new Set(mockCourses.map((c) => c.title));
  const extraRecords = courseRecords.filter((r) => !mockTitles.has(r.title));

  for (const record of extraRecords) {
    const existing = await prisma.course.findUnique({
      where: { id: record.id },
      select: { id: true },
    });
    if (existing) continue;

    const totalMinutes = record.modules.reduce(
      (sum, m) => sum + parseMinutes(m.duration),
      0,
    );
    const category = await upsertCategory(record.category);
    await prisma.course.create({
      data: {
        id: record.id,
        title: record.title,
        description: record.description,
        durationHours: Math.max(1, Math.ceil(totalMinutes / 60)),
        level: "BEGINNER",
        categoryId: category.id,
        status: statusMap[record.status],
        coverImage: record.coverImage,
        modules: {
          create: record.modules.map((m) => ({
            id: m.id,
            title: m.title,
            order: m.order,
            type: "VIDEO" as const,
            durationMinutes: parseMinutes(m.duration),
            coverImage: m.coverImage,
            videoUrl: m.videoUrl || null,
            overview: m.overview,
            hasQuiz: m.hasQuiz,
            notes: {
              create: m.notes.map((n) => ({
                id: n.id,
                heading: n.heading,
                body: n.body,
              })),
            },
            resources: {
              create: m.resources.map((r) => ({
                id: r.id,
                title: r.title,
                type: r.type,
                meta: r.meta,
                fileUrl: r.fileUrl ?? null,
              })),
            },
            quiz:
              m.quiz.questions.length > 0
                ? {
                    create: {
                      passingScore: m.quiz.passingScore,
                      questions: {
                        create: m.quiz.questions.map((q) => ({
                          id: q.id,
                          question: q.question,
                          options: q.options,
                          correctIndex: q.correctIndex,
                          marks: q.marks,
                        })),
                      },
                    },
                  }
                : undefined,
          })),
        },
      },
    });
  }
  console.log(`  extra admin-panel courses: ${extraRecords.length}`);
}

async function seedEnrollmentsAndAssessments() {
  await prisma.enrollment.createMany({
    data: mockEnrollments.map((e) => ({
      id: e.id,
      userId: e.userId,
      courseId: e.courseId,
      status: e.status,
      progress: e.progress,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
    })),
    skipDuplicates: true,
  });

  await prisma.assessment.createMany({
    data: mockAssessments.map((a) => ({
      id: a.id,
      courseId: a.courseId,
      title: a.title,
      type: a.type,
      totalMarks: a.totalMarks,
      passingMarks: a.passingMarks,
      createdAt: a.createdAt,
    })),
    skipDuplicates: true,
  });

  await prisma.question.createMany({
    data: mockQuestions.map((q) => ({
      id: q.id,
      assessmentId: q.assessmentId,
      type: q.type,
      question: q.question,
      marks: q.marks,
      options: q.options ?? [],
      correctAnswer: q.correctAnswer,
      rubric: q.rubric,
    })),
    skipDuplicates: true,
  });

  await prisma.submission.createMany({
    data: mockSubmissions.map((s) => ({
      id: s.id,
      assessmentId: s.assessmentId,
      userId: s.userId,
      status: s.status,
      obtainedMarks: s.obtainedMarks,
      submittedAt: s.submittedAt,
      gradedAt: s.gradedAt,
      answerSheetUrls: s.answerSheetUrls ?? [],
    })),
    skipDuplicates: true,
  });

  console.log(
    `  enrollments: ${mockEnrollments.length}, assessments: ${mockAssessments.length}, questions: ${mockQuestions.length}, submissions: ${mockSubmissions.length}`,
  );
}

async function seedMisc() {
  const seededUserIds = new Set(
    mockUsers
      .filter((user) => seededRoles.includes(user.role))
      .map((user) => user.id),
  );

  const certificates = mockCertificates.filter((c) =>
    seededUserIds.has(c.userId),
  );
  await prisma.certificate.createMany({
    data: certificates.map((c) => ({
      id: c.id,
      userId: c.userId,
      courseId: c.courseId,
      issueDate: c.issueDate,
      certificateNumber: c.certificateNumber,
    })),
    skipDuplicates: true,
  });

  const notifications = mockNotifications.filter((n) =>
    seededUserIds.has(n.userId),
  );
  await prisma.notification.createMany({
    data: notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
    skipDuplicates: true,
  });

  const auditLogs = mockAuditLogs.filter((a) => seededUserIds.has(a.userId));
  await prisma.auditLog.createMany({
    data: auditLogs.map((a) => ({
      id: a.id,
      userId: a.userId,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      changes: a.changes as object | undefined,
      createdAt: a.createdAt,
    })),
    skipDuplicates: true,
  });

  console.log(
    `  certificates: ${certificates.length}, notifications: ${notifications.length}, audit logs: ${auditLogs.length}`,
  );
}

async function seedLiveClasses() {
  await prisma.liveClass.createMany({
    data: mockLiveClasses.map((lc) => ({
      id: lc.id,
      title: lc.title,
      courseId: lc.courseId,
      subjectName: lc.subjectName,
      instructorId: lc.instructorId,
      batchName: lc.batchName,
      status: lc.status,
      meetingType: lc.meetingType,
      recurrence: lc.recurrence,
      durationMinutes: lc.durationMinutes,
      meetingLink: lc.meetingLink,
      waitingRoomEnabled: lc.waitingRoomEnabled,
      recordingEnabled: lc.recordingEnabled,
      autoAttendanceEnabled: lc.autoAttendanceEnabled,
      createdAt: lc.createdAt,
    })),
    skipDuplicates: true,
  });

  await prisma.liveClassSession.createMany({
    data: mockLiveClassSessions.map((s) => ({
      id: s.id,
      liveClassId: s.liveClassId,
      scheduledStart: s.scheduledStart,
      scheduledEnd: s.scheduledEnd,
      actualStart: s.actualStart,
      actualEnd: s.actualEnd,
      status: s.status,
      recordingUrl: s.recordingUrl,
      recordingSizeMb: s.recordingSizeMb,
    })),
    skipDuplicates: true,
  });

  await prisma.liveClassAttendance.createMany({
    data: mockLiveClassAttendance.map((a) => ({
      id: a.id,
      sessionId: a.sessionId,
      userId: a.userId,
      status: a.status,
      joinTime: a.joinTime,
      leaveTime: a.leaveTime,
      durationMinutes: a.durationMinutes,
      speakTimeSeconds: a.speakTimeSeconds,
    })),
    skipDuplicates: true,
  });

  await prisma.liveChatMessage.createMany({
    data: mockLiveChatMessages.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      userId: m.userId,
      message: m.message,
      isPrivate: m.isPrivate,
      toUserId: m.toUserId,
      sentAt: m.sentAt,
    })),
    skipDuplicates: true,
  });

  console.log(
    `  live classes: ${mockLiveClasses.length}, sessions: ${mockLiveClassSessions.length}, attendance: ${mockLiveClassAttendance.length}, chat: ${mockLiveChatMessages.length}`,
  );
}

async function seedRolePermissions() {
  // SUPER_ADMIN: everything allowed.
  // Staff roles use the admin matrix. Portal roles use conservative defaults;
  // ownership/enrollment checks still apply in addition to these grants.
  const staffRoles: Role[] = ["COURSE_MANAGER", "EXAMINER", "REPORT_VIEWER"];
  const portalDefaults = (
    role: "INSTRUCTOR" | "STUDENT",
    module: PermissionModule,
  ) => {
    if (role === "INSTRUCTOR") {
      if (module === "COURSES") return [true, true, true, true, false];
      if (module === "REPORTS") return [true, false, false, false, true];
      if (module === "SETTINGS") return [true, false, true, false, false];
      return [false, false, false, false, false];
    }
    if (module === "COURSES") return [true, false, true, false, false];
    if (module === "ASSESSMENTS") return [true, true, false, false, false];
    if (module === "QUESTION_BANK" || module === "CERTIFICATES") {
      return [true, false, false, false, false];
    }
    if (module === "SETTINGS") return [true, false, true, false, false];
    return [false, false, false, false, false];
  };
  const rows: {
    role: Role;
    module: PermissionModule;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
  }[] = [];

  for (const entry of permissionModules) {
    const module = permissionModuleMap[entry.module];
    if (!module) continue;
    const [view, create, edit, del, exp] = entry.values.map((v) => v === "yes");

    rows.push({
      role: "SUPER_ADMIN",
      module,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
    });
    for (const role of staffRoles) {
      rows.push({
        role,
        module,
        canView: view,
        canCreate: create,
        canEdit: edit,
        canDelete: del,
        canExport: exp,
      });
    }
    for (const role of ["INSTRUCTOR", "STUDENT"] as const) {
      const [canView, canCreate, canEdit, canDelete, canExport] =
        portalDefaults(role, module);
      rows.push({
        role,
        module,
        canView,
        canCreate,
        canEdit,
        canDelete,
        canExport,
      });
    }
  }

  for (const row of rows) {
    await prisma.rolePermission.upsert({
      where: {
        role_module: {
          role: row.role,
          module: row.module,
        },
      },
      create: row,
      // Defaults initialize new rows only. Preserve permissions subsequently
      // customized by an admin; SUPER_ADMIN remains immutable/full-access.
      update:
        row.role === "SUPER_ADMIN"
          ? {
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true,
              canExport: true,
            }
          : {},
    });
  }
  console.log(`  role permissions: ${rows.length}`);
}

async function main() {
  console.log("Seeding (existing data is kept, new records are upserted)...");
  await seedUsers();
  await seedCourses();
  await seedEnrollmentsAndAssessments();
  await seedMisc();
  await seedLiveClasses();
  await seedRolePermissions();

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
