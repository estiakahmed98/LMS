/** Runs real PostgreSQL checks in a transaction that always rolls back. */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { getLearnerAssessmentList } from "../lib/assessment-list-server";
import { parseAssessmentFilters } from "../lib/assessment-list";

async function main() {
  const rollback = new Error("ROLLBACK_TEST_FIXTURES");
  try {
    await prisma.$transaction(async tx => {
      const tag = randomUUID();
      const user = await tx.user.create({ data: { name: "Assessment integration test", email: `${tag}@example.invalid` } });
      const course = await tx.course.create({ data: { title: "Assessment integration test", description: "Rollback fixture", durationHours: 1, level: "BEGINNER" } });
      await tx.enrollment.create({ data: { userId: user.id, courseId: course.id, status: "APPROVED" } });
      const batch = await tx.batch.create({ data: { name: tag, code: tag, status: "ACTIVE", memberships: { create: { userId: user.id } } } });
      const createdAt = new Date("2020-01-01T00:00:00.123Z");
      for (let index = 0; index < 28; index++) {
        const assessment = await tx.assessment.create({ data: { title: `Fixture ${index}`, courseId: course.id, type: "MCQ", totalMarks: 10, passingMarks: 5, createdAt } });
        await tx.assessmentAssignment.create({ data: { assessmentId: assessment.id, targetType: "COURSE", targetKey: "COURSE", status: "PUBLISHED", availableFrom: index === 0 ? new Date("2099-01-01") : null, dueAt: index === 1 ? new Date("2020-01-02") : null } });
        if (index === 2 || index === 3) await tx.submission.create({ data: { assessmentId: assessment.id, userId: user.id, status: index === 2 ? "GRADED" : "SUBMITTED", obtainedMarks: index === 2 ? 8 : null } });
        if (index === 4) {
          // A future individual override must not hide an already open course assignment.
          await tx.assessmentAssignment.create({ data: { assessmentId: assessment.id, targetType: "LEARNER", targetKey: user.id, learnerId: user.id, status: "PUBLISHED", availableFrom: new Date("2099-01-01") } });
        }
        if (index === 5) await tx.assessmentAssignment.create({ data: { assessmentId: assessment.id, targetType: "BATCH", targetKey: batch.id, batchId: batch.id, status: "PUBLISHED" } });
      }
      // Published work for somebody else and drafts must never become visible.
      for (const published of [true, false]) {
        const hidden = await tx.assessment.create({ data: { title: "Hidden fixture", courseId: course.id, type: "MCQ", totalMarks: 10, passingMarks: 5 } });
        await tx.assessmentAssignment.create({ data: { assessmentId: hidden.id, targetType: published ? "BATCH" : "COURSE", targetKey: "hidden", status: published ? "PUBLISHED" : "DRAFT" } });
      }
      const query = (text = "") => getLearnerAssessmentList(user.id, parseAssessmentFilters(new URLSearchParams(text)), tx);
      const first = await query();
      assert.equal(first.total, 28);
      assert.equal(first.assessments.length, 12);
      assert.equal(first.statusCounts.UPCOMING, 1);
      assert.equal(first.statusCounts.CLOSED, 1);
      assert.equal(first.statusCounts.PENDING, 1);
      assert.equal(first.statusCounts.COMPLETED, 1);
      assert.equal(first.statusCounts.AVAILABLE, 24);
      const second = await query(`cursor=${encodeURIComponent(first.nextCursor!)}`);
      const third = await query(`cursor=${encodeURIComponent(second.nextCursor!)}`);
      assert.equal(new Set([...first.assessments, ...second.assessments, ...third.assessments].map(row => row.id)).size, 28);
      assert.equal(third.nextCursor, null);
      assert.equal((await query("status=COMPLETED")).assessments[0].obtainedMarks, 8);
      assert.equal((await query(`batchId=${batch.id}`)).total, 1);
      assert.equal((await query("scope=BATCH")).total, 1);
      assert.equal((await query("from=2020-01-01&to=2020-01-01")).total, 27);
      assert.equal((await query("from=2020-01-02")).total, 1);
      assert.equal((await query("courseId=not-my-course")).total, 0);
      const outsider = await getLearnerAssessmentList("not-a-learner", parseAssessmentFilters(new URLSearchParams()), tx);
      assert.equal(outsider.total, 0);
      await tx.batch.update({ where: { id: batch.id }, data: { startDate: new Date("2099-01-01") } });
      // Its course assignment stays available while the batch is still scheduled.
      assert.equal((await query("scope=COURSE")).total, 28);
      await tx.enrollment.updateMany({ where: { userId: user.id }, data: { status: "PENDING" } });
      assert.equal((await query()).total, 0);
      console.log("PASS: statuses, future override, batch membership, same-timestamp cursor pages, date boundaries, course filters, and learner isolation.");
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
