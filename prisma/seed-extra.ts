// Supplemental seed data — fills in every model that prisma/seed.ts leaves
// empty (StudentProfile, ModuleQuizAttempt, SubmissionQuestionGrade,
// Certificate/CertificateTemplate/CertificateSequence, Notification/
// NotificationCampaign, VideoProgress, LiveClassJoinRequest,
// LiveRecordingChunkLog, Institution, AssessmentAssignment, ExamType, and the
// question-bank subsystem) with >=10 rows each, using ids already created by
// seed.ts. Append-only, like seed.ts: never overwrites existing rows.
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { encryptOptional } from "../lib/security/encryption";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

// user_1-5,6,10 are STUDENT; user_7/user_102 are SUPER_ADMIN; user_8/9 are
// COURSE_MANAGER/EXAMINER (not seeded by seed.ts) — see lib/mock-data.ts.
const studentIds = [
  "user_1",
  "user_2",
  "user_3",
  "user_4",
  "user_5",
  "user_6",
  "user_10",
  "ai_wih_estiak_student_1",
  "ai_wih_estiak_student_2",
  "ai_wih_estiak_student_3",
  "ai_wih_estiak_student_4",
];
const instructorIds = ["user_11", "user_12", "user_13"];
const courseIds = Array.from({ length: 10 }, (_, i) => `course_${i + 1}`);

async function seedStudentProfiles() {
  const rows = [
    { userId: "user_1", city: "Dhaka", postalCode: "1207", address: "House 12, Road 5, Dhanmondi", nid: "1990123456789" },
    { userId: "user_2", city: "Chattogram", postalCode: "4000", address: "Flat 3B, Agrabad", nid: "1991123456780" },
    { userId: "user_3", city: "Sylhet", postalCode: "3100", address: "Zindabazar Road", nid: "1992123456781" },
    { userId: "user_4", city: "Khulna", postalCode: "9000", address: "Khan Jahan Ali Road", nid: "1993123456782" },
    { userId: "user_5", city: "Rajshahi", postalCode: "6000", address: "Shaheb Bazar", nid: "1994123456783" },
    { userId: "user_6", city: "Barishal", postalCode: "8200", address: "Band Road", nid: "1995123456784" },
    { userId: "user_10", city: "Mymensingh", postalCode: "2200", address: "Charpara", nid: "1997123456786" },
    { userId: "ai_wih_estiak_student_1", city: "Dhaka", postalCode: "1219", address: "Mirpur-10", nid: "1998123456790" },
    { userId: "ai_wih_estiak_student_2", city: "Dhaka", postalCode: "1230", address: "Uttara Sector 3", nid: "1999123456791" },
    { userId: "user_11", city: "Dhaka", postalCode: "1212", address: "Gulshan-1", nid: "1988123456787" },
    { userId: "user_12", city: "Dhaka", postalCode: "1216", address: "Bashundhara R/A", nid: "1987123456788" },
    { userId: "user_13", city: "Dhaka", postalCode: "1230", address: "Uttara Sector 7", nid: "1986123456789" },
  ];

  let count = 0;
  for (const r of rows) {
    const user = await prisma.user.findUnique({ where: { id: r.userId } });
    if (!user) continue;
    await prisma.studentProfile.upsert({
      where: { userId: r.userId },
      update: {},
      create: {
        userId: r.userId,
        city: r.city,
        postalCode: r.postalCode,
        address: r.address,
        dateOfBirth: new Date("1995-01-15T00:00:00.000Z"),
        nidNumberEnc: encryptOptional(r.nid),
      },
    });
    count += 1;
  }
  console.log(`  student profiles: ${count}`);
}

async function seedInstitutions() {
  const names: { name: string; type: "SCHOOL" | "COLLEGE" | "UNIVERSITY" | "OTHER" }[] = [
    { name: "Dhaka Medical College", type: "COLLEGE" },
    { name: "University of Dhaka", type: "UNIVERSITY" },
    { name: "Chittagong Medical College", type: "COLLEGE" },
    { name: "BUET", type: "UNIVERSITY" },
    { name: "Rajshahi Medical College", type: "COLLEGE" },
    { name: "Notre Dame College", type: "SCHOOL" },
    { name: "Sylhet MAG Osmani Medical College", type: "COLLEGE" },
    { name: "North South University", type: "UNIVERSITY" },
    { name: "BRAC University", type: "UNIVERSITY" },
    { name: "PSTC Training Wing", type: "OTHER" },
    { name: "Bangladesh Nursing Institute", type: "OTHER" },
  ];

  const rows = [];
  for (const n of names) {
    const row = await prisma.institution.upsert({
      where: { name_type: { name: n.name, type: n.type } },
      update: {},
      create: { name: n.name, type: n.type },
    });
    rows.push(row);
  }
  console.log(`  institutions: ${rows.length}`);
  return rows;
}

async function seedExamTypes() {
  const names = [
    "Module Final Exam",
    "Mid-Term Assessment",
    "Practical Skills Test",
    "Certification Exam",
    "Mock Exam",
    "Entrance Assessment",
    "Board Exam Practice",
    "Refresher Quiz",
    "Annual Proficiency Test",
    "OSCE Practical",
    "Viva Voce",
  ];

  const rows = [];
  for (const name of names) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const row = await prisma.examType.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
    rows.push(row);
  }
  console.log(`  exam types: ${rows.length}`);
  return rows;
}

async function seedQuestionBank(
  institutions: { id: string }[],
  examTypes: { id: string }[],
) {
  const difficulties = ["EASY", "MEDIUM", "HARD"] as const;
  const items = Array.from({ length: 15 }, (_, i) => {
    const type = i % 3 === 0 ? "WRITTEN" : i % 3 === 1 ? "PRACTICAL" : "MCQ";
    const courseId = courseIds[i % courseIds.length];
    const institution = institutions[i % institutions.length];
    const examType = examTypes[i % examTypes.length];
    return {
      id: `qbank_item_${i + 1}`,
      type: type as "MCQ" | "WRITTEN" | "PRACTICAL",
      question: `Question bank item #${i + 1}: describe the correct procedure for scenario ${i + 1}.`,
      subject: `Subject ${((i % 5) + 1)}`,
      options: type === "MCQ" ? ["Option A", "Option B", "Option C", "Option D"] : [],
      correctAnswer: type === "MCQ" ? "Option A" : null,
      explanation: type === "MCQ" ? `Option A is correct because it matches protocol ${i + 1}.` : null,
      rubric: type !== "MCQ" ? `Award marks for accuracy, clarity, and completeness (scenario ${i + 1}).` : null,
      difficulty: difficulties[i % difficulties.length],
      marks: 5 + (i % 4) * 5,
      examYear: 2022 + (i % 4),
      status: (["DRAFT", "REVIEW", "APPROVED", "PUBLISHED"] as const)[i % 4],
      contentHash: `qbank_hash_${i + 1}`,
      tags: [`tag-${(i % 5) + 1}`, "seed"],
      courseId,
      institutionId: institution.id,
      examTypeId: examType.id,
      createdById: instructorIds[i % instructorIds.length],
    };
  });

  for (const item of items) {
    await prisma.questionBankItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`  question bank items: ${items.length}`);

  // Translations for a subset (Bangla), keeping >=10 overall.
  let translationCount = 0;
  for (let i = 0; i < 10; i++) {
    const item = items[i];
    await prisma.questionBankTranslation.upsert({
      where: {
        questionBankItemId_locale: { questionBankItemId: item.id, locale: "bn" },
      },
      update: {},
      create: {
        questionBankItemId: item.id,
        locale: "bn",
        question: `প্রশ্ন ব্যাংক আইটেম #${i + 1}: দৃশ্যকল্প ${i + 1} এর জন্য সঠিক পদ্ধতি বর্ণনা করুন।`,
        options: item.options,
        correctAnswer: item.correctAnswer,
      },
    });
    translationCount += 1;
  }
  console.log(`  question bank translations: ${translationCount}`);

  return items;
}

async function seedQuestionPapers(
  institutions: { id: string }[],
  examTypes: { id: string }[],
) {
  const papers = Array.from({ length: 10 }, (_, i) => ({
    id: `qpaper_${i + 1}`,
    title: `Question Paper ${i + 1} — ${["MCQ Set", "Written Set", "Practical Set"][i % 3]}`,
    specialInstructions: "Answer all questions. Write clearly and manage your time.",
    fullMarksOverride: 100,
    questionsToAnswer: 10,
    courseId: courseIds[i % courseIds.length],
    examTypeId: examTypes[i % examTypes.length].id,
    institutionId: institutions[i % institutions.length].id,
    examYear: 2023 + (i % 3),
    createdById: instructorIds[i % instructorIds.length],
  }));

  for (const paper of papers) {
    await prisma.questionPaper.upsert({
      where: { id: paper.id },
      update: {},
      create: paper,
    });
  }
  console.log(`  question papers: ${papers.length}`);
  return papers;
}

async function seedQuestionImports() {
  const jobs = Array.from({ length: 10 }, (_, i) => ({
    id: `qimport_job_${i + 1}`,
    fileName: `import-batch-${i + 1}.pdf`,
    fileUrl: `/uploads/imports/import-batch-${i + 1}.pdf`,
    status: (["PROCESSING", "NEEDS_REVIEW", "COMPLETED", "FAILED"] as const)[i % 4],
    totalPages: 5 + (i % 5),
    extractedCount: 10 + i,
    createdById: instructorIds[i % instructorIds.length],
  }));

  for (const job of jobs) {
    await prisma.questionImportJob.upsert({
      where: { id: job.id },
      update: {},
      create: job,
    });
  }
  console.log(`  question import jobs: ${jobs.length}`);

  const drafts = Array.from({ length: 12 }, (_, i) => ({
    id: `qimport_draft_${i + 1}`,
    importJobId: jobs[i % jobs.length].id,
    pageNumber: (i % 5) + 1,
    type: (["MCQ", "WRITTEN", "PRACTICAL"] as const)[i % 3],
    question: `Extracted draft question #${i + 1} from OCR scan.`,
    options: i % 3 === 0 ? ["A", "B", "C", "D"] : [],
    correctAnswer: i % 3 === 0 ? "A" : null,
    rubric: i % 3 !== 0 ? "Grade on completeness and accuracy." : null,
    difficulty: (["EASY", "MEDIUM", "HARD"] as const)[i % 3],
    marks: 5,
    confidenceScore: 0.7 + (i % 3) * 0.1,
    status: (["PENDING", "NEEDS_REVIEW", "CONFIRMED", "REJECTED"] as const)[i % 4],
  }));

  for (const draft of drafts) {
    await prisma.questionImportDraft.upsert({
      where: { id: draft.id },
      update: {},
      create: draft,
    });
  }
  console.log(`  question import drafts: ${drafts.length}`);
}

async function seedVideoProgress() {
  const modules = await prisma.module.findMany({
    take: 12,
    orderBy: { id: "asc" },
    select: { id: true },
  });

  let count = 0;
  for (const [i, mod] of modules.entries()) {
    const userId = studentIds[i % studentIds.length];
    await prisma.videoProgress.upsert({
      where: { userId_moduleId: { userId, moduleId: mod.id } },
      update: {},
      create: {
        userId,
        moduleId: mod.id,
        positionSeconds: 120 + i * 10,
        durationSeconds: 600,
        watchedPercent: Math.min(100, 20 + i * 7),
        openedAt: new Date(Date.now() - (i + 1) * 86_400_000),
        completed: i % 2 === 0,
        quizPassed: i % 3 === 0,
      },
    });
    count += 1;
  }
  console.log(`  video progress: ${count}`);
}

async function seedModuleQuizAttempts() {
  const quizzes = await prisma.moduleQuiz.findMany({
    select: { id: true, moduleId: true, passingScore: true },
  });
  if (quizzes.length === 0) {
    console.log("  module quiz attempts: 0 (no ModuleQuiz rows to attach to)");
    return;
  }

  let count = 0;
  for (let i = 0; i < 12; i++) {
    const quiz = quizzes[i % quizzes.length];
    const userId = studentIds[i % studentIds.length];
    const totalMarks = 20;
    const score = 40 + ((i * 13) % 61);
    await prisma.moduleQuizAttempt.create({
      data: {
        quizId: quiz.id,
        moduleId: quiz.moduleId,
        userId,
        answers: { "1": 0, "2": 1, "3": 2 },
        score,
        obtainedMarks: Math.round((score / 100) * totalMarks),
        totalMarks,
        passed: score >= quiz.passingScore,
      },
    });
    count += 1;
  }
  console.log(`  module quiz attempts: ${count}`);
}

async function seedSubmissionQuestionGrades() {
  const submissions = await prisma.submission.findMany({
    select: { id: true, assessmentId: true },
  });
  if (submissions.length === 0) {
    console.log("  submission question grades: 0 (no submissions)");
    return;
  }

  let count = 0;
  for (const submission of submissions) {
    const questions = await prisma.question.findMany({
      where: { assessmentId: submission.assessmentId },
      take: 3,
      select: { id: true },
    });
    for (const [i, question] of questions.entries()) {
      await prisma.submissionQuestionGrade.upsert({
        where: {
          submissionId_questionId: {
            submissionId: submission.id,
            questionId: question.id,
          },
        },
        update: {},
        create: {
          submissionId: submission.id,
          questionId: question.id,
          makerMarks: 4 + (i % 2),
          makerComment: "Good coverage of key points.",
          checkerMarks: 4 + (i % 2),
          checkerComment: "Agreed with maker's assessment.",
        },
      });
      count += 1;
      if (count >= 10) break;
    }
    if (count >= 10) break;
  }
  console.log(`  submission question grades: ${count}`);
}

async function seedCertificateSystem() {
  await prisma.certificateTemplate.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      issuerName: "Professional Skills Training Center",
      issuerCode: "PSTC",
      borderColor: "#DC2626",
      fontFamily: "SERIF_FORMAL",
    },
  });
  console.log("  certificate templates: 1");

  const year = new Date().getFullYear();
  await prisma.certificateSequence.upsert({
    where: { issuerCode_year: { issuerCode: "PSTC", year } },
    update: {},
    create: { id: `PSTC-${year}`, issuerCode: "PSTC", year, current: 12 },
  });
  console.log("  certificate sequences: 1");

  const approvedEnrollments = await prisma.enrollment.findMany({
    where: { status: "APPROVED" },
    take: 12,
    select: { userId: true, courseId: true },
    distinct: ["userId", "courseId"],
  });

  let count = 0;
  for (const [i, enr] of approvedEnrollments.entries()) {
    const seq = i + 1;
    await prisma.certificate.upsert({
      where: { certificateNumber: `PSTC-${year}-${String(seq).padStart(6, "0")}` },
      update: {},
      create: {
        userId: enr.userId,
        courseId: enr.courseId,
        certificateNumber: `PSTC-${year}-${String(seq).padStart(6, "0")}`,
        issuerName: "Professional Skills Training Center",
        issuerCode: "PSTC",
        borderColor: "#DC2626",
        fontFamily: "SERIF_FORMAL",
      },
    });
    count += 1;
  }
  console.log(`  certificates: ${count}`);
}

async function seedNotificationSystem() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["STUDENT", "INSTRUCTOR"] } },
    take: 14,
    select: { id: true, role: true },
  });

  const campaigns = [
    { subject: "New course published", message: "A new course is now available for enrollment.", type: "INFO" as const, audienceType: "ALL_ACTIVE_STUDENTS" as const },
    { subject: "Assessment due soon", message: "Your assessment deadline is approaching.", type: "WARNING" as const, audienceType: "ASSESSMENT_PENDING_STUDENTS" as const },
    { subject: "Certificate issued", message: "Congratulations! Your certificate has been issued.", type: "SUCCESS" as const, audienceType: "COURSE_STUDENTS" as const },
    { subject: "Grading overdue", message: "Some submissions are pending review beyond SLA.", type: "ERROR" as const, audienceType: "ALL_ACTIVE_INSTRUCTORS" as const },
    { subject: "New batch assigned", message: "You have been assigned to a new cohort.", type: "INFO" as const, audienceType: "SPECIFIC_INSTRUCTOR" as const },
    { subject: "System maintenance", message: "Scheduled maintenance this weekend.", type: "WARNING" as const, audienceType: "ALL_ACTIVE_STUDENTS" as const },
  ];

  const createdCampaigns = [];
  for (const [i, c] of campaigns.entries()) {
    const created = await prisma.notificationCampaign.create({
      data: {
        subject: c.subject,
        message: c.message,
        type: c.type,
        audienceType: c.audienceType,
        recipientCount: users.length,
        createdById: instructorIds[i % instructorIds.length],
        targetInstructorId: c.audienceType === "SPECIFIC_INSTRUCTOR" ? instructorIds[0] : null,
      },
    });
    createdCampaigns.push(created);
  }
  console.log(`  notification campaigns: ${createdCampaigns.length}`);

  let notifCount = 0;
  for (const [i, user] of users.entries()) {
    const campaign = createdCampaigns[i % createdCampaigns.length];
    await prisma.notification.upsert({
      where: { campaignId_userId: { campaignId: campaign.id, userId: user.id } },
      update: {},
      create: {
        userId: user.id,
        campaignId: campaign.id,
        title: campaign.subject,
        message: campaign.message,
        type: campaign.type,
        readAt: i % 2 === 0 ? new Date() : null,
      },
    });
    notifCount += 1;
  }
  console.log(`  notifications: ${notifCount}`);
}

async function seedAssessmentAssignments() {
  const assessments = await prisma.assessment.findMany({
    take: 6,
    select: { id: true, courseId: true },
  });
  const batches = await prisma.batch.findMany({ take: 4, select: { id: true } });
  if (assessments.length === 0) {
    console.log("  assessment assignments: 0 (no assessments)");
    return;
  }

  let count = 0;
  // COURSE-level assignments
  for (const [i, a] of assessments.entries()) {
    await prisma.assessmentAssignment.upsert({
      where: { assessmentId_targetKey: { assessmentId: a.id, targetKey: `course:${a.courseId}` } },
      update: {},
      create: {
        assessmentId: a.id,
        targetType: "COURSE",
        targetKey: `course:${a.courseId}`,
        status: "PUBLISHED",
        availableFrom: new Date(Date.now() - 7 * 86_400_000),
        dueAt: new Date(Date.now() + 14 * 86_400_000),
        attemptLimit: 2,
        createdById: instructorIds[i % instructorIds.length],
      },
    });
    count += 1;
  }
  // BATCH-level assignments
  for (const [i, batch] of batches.entries()) {
    const assessment = assessments[i % assessments.length];
    await prisma.assessmentAssignment.upsert({
      where: { assessmentId_targetKey: { assessmentId: assessment.id, targetKey: `batch:${batch.id}` } },
      update: {},
      create: {
        assessmentId: assessment.id,
        targetType: "BATCH",
        targetKey: `batch:${batch.id}`,
        batchId: batch.id,
        status: "PUBLISHED",
        availableFrom: new Date(Date.now() - 3 * 86_400_000),
        dueAt: new Date(Date.now() + 21 * 86_400_000),
        attemptLimit: 1,
        createdById: instructorIds[i % instructorIds.length],
      },
    });
    count += 1;
  }
  // LEARNER-level assignments
  for (const [i, studentId] of studentIds.slice(0, 4).entries()) {
    const assessment = assessments[i % assessments.length];
    await prisma.assessmentAssignment.upsert({
      where: { assessmentId_targetKey: { assessmentId: assessment.id, targetKey: `learner:${studentId}` } },
      update: {},
      create: {
        assessmentId: assessment.id,
        targetType: "LEARNER",
        targetKey: `learner:${studentId}`,
        learnerId: studentId,
        status: "DRAFT",
        attemptLimit: 3,
        createdById: instructorIds[i % instructorIds.length],
      },
    });
    count += 1;
  }
  console.log(`  assessment assignments: ${count}`);
}

async function seedLiveClassJoinRequestsAndChunkLogs() {
  const sessions = await prisma.liveClassSession.findMany({
    take: 5,
    select: { id: true },
  });
  if (sessions.length === 0) {
    console.log("  live class join requests: 0, chunk logs: 0 (no sessions)");
    return;
  }

  let joinCount = 0;
  for (let i = 0; i < 11; i++) {
    const session = sessions[i % sessions.length];
    const userId = studentIds[i % studentIds.length];
    await prisma.liveClassJoinRequest.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId } },
      update: {},
      create: {
        sessionId: session.id,
        userId,
        status: i % 3 === 0 ? "REJECTED" : "PENDING",
      },
    });
    joinCount += 1;
  }
  console.log(`  live class join requests: ${joinCount}`);

  let chunkCount = 0;
  const attemptId = "seed-recording-attempt-1";
  for (let i = 0; i < 12; i++) {
    const session = sessions[i % sessions.length];
    await prisma.liveRecordingChunkLog.upsert({
      where: {
        recordingAttemptId_seq: {
          recordingAttemptId: `${attemptId}-${session.id}`,
          seq: Math.floor(i / sessions.length),
        },
      },
      update: {},
      create: {
        sessionId: session.id,
        recordingAttemptId: `${attemptId}-${session.id}`,
        seq: Math.floor(i / sessions.length),
        byteLength: 512_000 + i * 1024,
      },
    });
    chunkCount += 1;
  }
  console.log(`  live recording chunk logs: ${chunkCount}`);
}

async function main() {
  console.log("Seeding supplemental data (append-only)...");
  await seedStudentProfiles();
  const institutions = await seedInstitutions();
  const examTypes = await seedExamTypes();
  await seedQuestionBank(institutions, examTypes);
  await seedQuestionPapers(institutions, examTypes);
  await seedQuestionImports();
  await seedVideoProgress();
  await seedModuleQuizAttempts();
  await seedSubmissionQuestionGrades();
  await seedCertificateSystem();
  await seedNotificationSystem();
  await seedAssessmentAssignments();
  await seedLiveClassJoinRequestsAndChunkLogs();
  console.log("Supplemental seeding done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
