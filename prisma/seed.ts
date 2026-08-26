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

const demoCohorts = [
  {
    id: "demo_cohort_a_2026",
    code: "PSTC-CP-2026-A",
    name: "Batch A - 2026",
    description: "Community and advanced medical delivery cohort.",
    courseIds: ["course_1", "course_3"],
    memberIds: ["user_1", "user_4", "user_10"],
    assignments: [
      ["course_1", "user_11", "LEAD"],
      ["course_1", "user_12", "ASSISTANT"],
      ["course_1", "user_11", "MAKER"],
      ["course_1", "user_13", "CHECKER"],
      ["course_3", "user_11", "LEAD"],
      ["course_3", "user_13", "ASSISTANT"],
      ["course_3", "user_11", "MAKER"],
      ["course_3", "user_12", "CHECKER"],
    ],
  },
  {
    id: "demo_cohort_b_2026",
    code: "PSTC-HR-2026-B",
    name: "Batch B - 2026",
    description: "HR and occupational safety delivery cohort.",
    courseIds: ["course_2", "course_7"],
    memberIds: ["user_1", "user_5"],
    assignments: [
      ["course_2", "user_12", "LEAD"],
      ["course_2", "user_13", "ASSISTANT"],
      ["course_2", "user_12", "MAKER"],
      ["course_2", "user_11", "CHECKER"],
      ["course_7", "user_12", "LEAD"],
      ["course_7", "user_13", "MAKER"],
      ["course_7", "user_11", "CHECKER"],
    ],
  },
  {
    id: "demo_cohort_c_2026",
    code: "PSTC-BLS-2026-C",
    name: "Batch C - 2026",
    description: "Basic Life Support practical certification cohort.",
    courseIds: ["course_6"],
    memberIds: ["user_1", "user_2", "user_4"],
    assignments: [
      ["course_6", "user_13", "LEAD"],
      ["course_6", "user_11", "ASSISTANT"],
      ["course_6", "user_13", "MAKER"],
      ["course_6", "user_12", "CHECKER"],
    ],
  },
  {
    id: "demo_cohort_d_2026",
    code: "PSTC-CP-2026-D",
    name: "Batch D - 2026",
    description:
      "Isolation fixture sharing Community Paramedic Training with Batch A.",
    courseIds: ["course_1"],
    memberIds: ["user_5"],
    assignments: [
      ["course_1", "user_12", "LEAD"],
      ["course_1", "user_13", "ASSISTANT"],
      ["course_1", "user_12", "MAKER"],
      ["course_1", "user_11", "CHECKER"],
    ],
  },
] as const;

function demoBatchCourseId(batchId: string, courseId: string) {
  return `${batchId}_${courseId}`;
}

const demoLiveClassScopes: Record<
  string,
  { batchId: string; batchCourseId: string }
> = {
  live_1: {
    batchId: "demo_cohort_a_2026",
    batchCourseId: demoBatchCourseId("demo_cohort_a_2026", "course_1"),
  },
  live_2: {
    batchId: "demo_cohort_b_2026",
    batchCourseId: demoBatchCourseId("demo_cohort_b_2026", "course_2"),
  },
  live_3: {
    batchId: "demo_cohort_a_2026",
    batchCourseId: demoBatchCourseId("demo_cohort_a_2026", "course_3"),
  },
  live_4: {
    batchId: "demo_cohort_c_2026",
    batchCourseId: demoBatchCourseId("demo_cohort_c_2026", "course_6"),
  },
  live_5: {
    batchId: "demo_cohort_b_2026",
    batchCourseId: demoBatchCourseId("demo_cohort_b_2026", "course_7"),
  },
};

// Unique subjects from the "Training Schedule on Sales & Implementation of
// ERP System". Trainer names and combined timetable cells are intentionally
// excluded so each reusable subject is seeded only once.
const salesErpSubjects = [
  "Orientation",
  "Sales Process",
  "Addon Products",
  "Sales Psychology",
  "Sales Positioning",
  "Cognitive Sales",
  "Basic Accounting",
  "Digital Marketing",
  "Basic HR",
  "Projects",
  "Sales Lifecycle",
  "Basic Manufacturing",
  "Target Account Selling",
  "Basic CRM",
  "Computer (Hardware)",
  "Computer (Software)",
  "Basic Supply Chain & Procurement",
  "Communication Skills",
  "E-commerce",
  "Accounting",
  "Manufacturing",
  "Psychology/Negotiation Skills",
  "Inventory",
  "Customer Service & Sales Generation",
  "Compelling Event",
  "Budget Planning",
  "QMS",
  "Trade Finance",
  "Engineering Maintenance",
  "Medical Centre",
  "Project Accounting",
  "Supply Chain",
  "HR & Payroll",
  "Sales & CRM",
  "Relationship & Rapport",
  "Employee Portal",
  "Administration",
  "Addon ERP for Trading",
  "Addon ERP for NGO",
  "Addon ERP for RMG",
  "Transport Pool",
  "Analytics",
  "Basic Accounting - Case",
] as const;

// Categories are created on the fly from whatever names appear in the mock
// course data — no fixed list, so a brand-new category needs no schema change.
async function upsertCategory(name: string) {
  const slug = slugify(name);
  return prisma.category.upsert({
    where: { slug },
    // Seed is append-only: never overwrite an existing database record.
    update: {},
    create: { name, slug },
  });
}

const seededRoles: Role[] = ["SUPER_ADMIN", "STUDENT", "INSTRUCTOR"];
const adminSeedPassword = "Admin123!";
const defaultSeedPassword = "12345678";

const aiWithEstiakStudents = [
  { name: "Shohel", email: "shoheltanbir55@gmail.com" },
  { name: "Zakir", email: "zakirmahmud3822@gmail.com" },
  { name: "Sayer", email: "abdulhaquesayer@gmail.com" },
  { name: "Saim", email: "saimbrogha5@gmail.com" },
  { name: "Rakib", email: "rakibul48hasan@gmail.com" },
  { name: "Rasel", email: "raselwebseo@gmail.com" },
  { name: "Prawnta", email: "prawtadham42@gmail.com" },
  { name: "Ashraful", email: "ashrafulislamem+@gmail.com" },
  { name: "Rifat", email: "khulmu6@gmail.com" },
  { name: "Zisan", email: "zisan@gmail.com" },
  { name: "Faysal", email: "faysul@gmail.com" },
] as const;

async function seedUsers() {
  const adminPasswordHash = await hashPassword(adminSeedPassword);
  const passwordHash = await hashPassword(defaultSeedPassword);

  const users = mockUsers.filter((user) => seededRoles.includes(user.role));

  for (const user of users) {
    const data = {
      name: user.name,
      email: user.email,
      phoneEnc: encryptOptional(user.phone),
      passwordHash:
        user.role === "SUPER_ADMIN" ? adminPasswordHash : passwordHash,
      role: user.role,
      status: user.status,
      lastActive: user.lastActive,
      createdAt: user.createdAt,
    };
    await prisma.user.upsert({
      where: { id: user.id },
      update: { passwordHash: data.passwordHash },
      create: { id: user.id, ...data },
    });
  }
  console.log(
    `  users: ${users.length} (admin password: "${adminSeedPassword}", default password: "${defaultSeedPassword}")`,
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
      update: {},
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
      update: {},
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

  const salesErpCategory = await upsertCategory("Sales & ERP");
  for (const subject of salesErpSubjects) {
    const id = `sales-erp-${slugify(subject)}`;
    const data = {
      title: subject,
      description: `${subject} training for Sales & Implementation of ERP System.`,
      durationHours: 1,
      level: "BEGINNER" as const,
      categoryId: salesErpCategory.id,
      status: "PUBLISHED" as const,
    };

    await prisma.course.upsert({
      where: { id },
      update: {},
      create: { id, ...data },
    });
  }
  console.log(`  Sales & ERP subjects: ${salesErpSubjects.length}`);
}

async function seedAiWithEstiakCourse() {
  const courseId = "course_ai_wih_estiak";
  const passwordHash = await hashPassword(defaultSeedPassword);

  await prisma.course.upsert({
    where: { id: courseId },
    update: {},
    create: {
      id: courseId,
      title: "AI wih Estiak",
      description: "AI wih Estiak course.",
      durationHours: 1,
      level: "BEGINNER",
      status: "PUBLISHED",
    },
  });

  for (const [index, student] of aiWithEstiakStudents.entries()) {
    const user = await prisma.user.upsert({
      where: { email: student.email },
      update: { passwordHash },
      create: {
        id: `ai_wih_estiak_student_${index + 1}`,
        name: student.name,
        email: student.email,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });

    await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId: user.id, courseId },
      },
      update: {},
      create: {
        id: `ai_wih_estiak_enrollment_${index + 1}`,
        userId: user.id,
        courseId,
        status: "APPROVED",
        directAssignment: true,
        directStatus: "APPROVED",
      },
    });
  }

  console.log(
    `  AI wih Estiak: ${aiWithEstiakStudents.length} students enrolled (default password: "${defaultSeedPassword}")`,
  );
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
    `  certificates: 0 (issued only through real eligibility workflow), notifications: 0 (created through real workflows), audit logs: ${auditLogs.length}`,
  );
}

async function seedCohorts() {
  let courseCount = 0;
  let membershipCount = 0;
  let enrollmentCount = 0;
  let assignmentCount = 0;

  for (const cohort of demoCohorts) {
    await prisma.batch.upsert({
      where: { id: cohort.id },
      update: {},
      create: {
        id: cohort.id,
        code: cohort.code,
        name: cohort.name,
        description: cohort.description,
        status: "ACTIVE",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T23:59:59.000Z"),
        capacity: 30,
        timezone: "Asia/Dhaka",
      },
    });

    for (const courseId of cohort.courseIds) {
      const batchCourseId = demoBatchCourseId(cohort.id, courseId);
      await prisma.batchCourse.upsert({
        where: { batchId_courseId: { batchId: cohort.id, courseId } },
        update: {},
        create: {
          id: batchCourseId,
          batchId: cohort.id,
          courseId,
          status: "ACTIVE",
        },
      });
      courseCount += 1;
    }

    for (const userId of cohort.memberIds) {
      const membershipId = `${cohort.id}_${userId}`;
      await prisma.batchMembership.upsert({
        where: { batchId_userId: { batchId: cohort.id, userId } },
        update: {},
        create: {
          id: membershipId,
          batchId: cohort.id,
          userId,
          status: "ACTIVE",
        },
      });
      membershipCount += 1;

      for (const courseId of cohort.courseIds) {
        let enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId } },
        });
        if (!enrollment) {
          enrollment = await prisma.enrollment.create({
            data: {
              id: `demo_enrollment_${cohort.id}_${userId}_${courseId}`,
              userId,
              courseId,
              status: "APPROVED",
              directAssignment: false,
              directStatus: null,
            },
          });
        } else if (enrollment.status !== "APPROVED") {
          throw new Error(
            `Demo cohort requires an approved enrollment for ${userId}:${courseId}.`,
          );
        } else if (
          enrollment.directAssignment &&
          enrollment.directStatus === null
        ) {
          enrollment = await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { directStatus: enrollment.status },
          });
        }

        const batchCourseId = demoBatchCourseId(cohort.id, courseId);
        await prisma.batchEnrollment.upsert({
          where: {
            batchMembershipId_batchCourseId: {
              batchMembershipId: membershipId,
              batchCourseId,
            },
          },
          update: {},
          create: {
            id: `demo_grant_${cohort.id}_${userId}_${courseId}`,
            batchMembershipId: membershipId,
            batchCourseId,
            enrollmentId: enrollment.id,
            status: "ACTIVE",
          },
        });
        enrollmentCount += 1;
      }
    }

    for (const [courseId, instructorId, role] of cohort.assignments) {
      const batchCourseId = demoBatchCourseId(cohort.id, courseId);
      await prisma.batchCourseInstructor.upsert({
        where: {
          batchCourseId_instructorId_role: {
            batchCourseId,
            instructorId,
            role,
          },
        },
        update: {},
        create: {
          id: `demo_instructor_${cohort.id}_${courseId}_${instructorId}_${role.toLowerCase()}`,
          batchCourseId,
          instructorId,
          role,
          status: "ACTIVE",
        },
      });
      assignmentCount += 1;
    }
  }

  console.log(
    `  cohorts: ${demoCohorts.length}, cohort courses: ${courseCount}, memberships: ${membershipCount}, grants: ${enrollmentCount}, instructor roles: ${assignmentCount}`,
  );
}

async function seedLiveClasses() {
  await prisma.liveClass.createMany({
    data: mockLiveClasses.map((lc) => {
      const scope = demoLiveClassScopes[lc.id];
      return {
        id: lc.id,
        title: lc.title,
        courseId: lc.courseId,
        subjectName: lc.subjectName,
        instructorId: lc.instructorId,
        batchId: scope?.batchId ?? null,
        batchCourseId: scope?.batchCourseId ?? null,
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
      };
    }),
    skipDuplicates: true,
  });

  for (const liveClass of mockLiveClasses) {
    const scope = demoLiveClassScopes[liveClass.id];
    if (!scope) continue;
    await prisma.liveClass.updateMany({
      where: { id: liveClass.id, batchCourseId: null },
      data: { ...scope, batchName: liveClass.batchName },
    });
  }

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
  // These defaults are inserted only when a role/module row is missing.
  // Existing permissions customized by an admin are never overwritten.
  const staffRoles: Role[] = ["COURSE_MANAGER", "EXAMINER", "REPORT_VIEWER"];
  const portalDefaults = (
    role: "INSTRUCTOR" | "STUDENT",
    module: PermissionModule,
  ) => {
    if (role === "INSTRUCTOR") {
      if (module === "COURSES") return [true, true, true, true, false];
      if (
        module === "ASSESSMENTS" ||
        module === "QUESTION_BANK" ||
        module === "GRADING"
      ) {
        return [true, true, true, true, false];
      }
      if (module === "SUBMISSIONS") return [true, false, false, false, false];
      if (module === "REPORTS") return [true, false, false, false, true];
      return [false, false, false, false, false];
    }
    if (
      module === "STUDENTS" ||
      module === "REPORTS" ||
      module === "SETTINGS" ||
      module === "ROLES"
    ) {
      return [false, false, false, false, false];
    }
    return [true, false, false, false, false];
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
      update: {},
    });
  }
  console.log(`  role permissions: ${rows.length}`);
}

async function main() {
  console.log("Seeding (append-only; existing records are never changed)...");
  await seedUsers();
  await seedCourses();
  await seedAiWithEstiakCourse();
  await seedEnrollmentsAndAssessments();
  await seedMisc();
  await seedCohorts();
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
