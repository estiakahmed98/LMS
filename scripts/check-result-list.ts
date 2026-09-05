/** Real PostgreSQL result-list checks; all fixtures are rolled back. */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { getLearnerAssessmentResults, getLearnerResultFilterOptions } from "../lib/result-list-server";
import { parseResultFilters } from "../lib/result-list";

async function main() {
  const rollback = new Error("ROLLBACK_RESULT_FIXTURES");
  try {
    await prisma.$transaction(async tx => {
      const tag = randomUUID();
      const user = await tx.user.create({ data: { name: "Results test", email: `${tag}@example.invalid` } });
      const outsider = await tx.user.create({ data: { name: "Other learner", email: `other-${tag}@example.invalid` } });
      const course = await tx.course.create({ data: { title: "Results test", description: "Rollback fixture", durationHours: 1, level: "BEGINNER" } });
      await tx.enrollment.create({ data: { userId: user.id, courseId: course.id, status: "APPROVED" } });
      await tx.enrollment.create({ data: { userId: outsider.id, courseId: course.id, status: "APPROVED" } });
      const batch = await tx.batch.create({ data: { name: tag, code: tag, memberships: { create: { userId: user.id, status: "WITHDRAWN" } } } });
      const assessment = await tx.assessment.create({ data: { title: "MCQ fixture", courseId: course.id, type: "MCQ", totalMarks: 10, passingMarks: 5 } });
      await tx.assessmentAssignment.create({ data: { assessmentId: assessment.id, targetType: "BATCH", targetKey: batch.id, batchId: batch.id, status: "CLOSED" } });
      const createdAt = new Date("2020-01-01T00:00:00.123Z");
      const submittedAt = new Date("2020-01-01T18:00:00Z"); // Jan 2, Bangladesh midnight.
      for (let index = 1; index <= 28; index++) {
        await tx.submission.create({ data: {
          assessmentId: assessment.id, userId: user.id, attemptNumber: index, createdAt,
          submittedAt: index === 4 ? null : submittedAt,
          status: index === 1 ? "GRADED" : index === 2 ? "REVIEWED" : index === 3 ? "GRADING" : "SUBMITTED",
          obtainedMarks: index === 1 ? 5 : index === 2 ? 0 : index === 3 ? 9 : null,
        } });
      }
      await tx.submission.create({ data: { assessmentId: assessment.id, userId: user.id, attemptNumber: 29, status: "DRAFT" } });
      await tx.submission.create({ data: { assessmentId: assessment.id, userId: outsider.id, status: "GRADED", obtainedMarks: 10, submittedAt } });
      const written = await tx.assessment.create({ data: { title: "Written fixture", courseId: course.id, type: "WRITTEN", totalMarks: 10, passingMarks: 5 } });
      await tx.submission.create({ data: { assessmentId: written.id, userId: user.id, status: "SUBMITTED", submittedAt } });
      const query = (text = "") => getLearnerAssessmentResults(user.id, parseResultFilters(new URLSearchParams(text)), tx);
      const first = await query();
      assert.equal(first.total, 28);
      assert.equal(first.typeCounts.WRITTEN, 1);
      assert.equal(first.statusCounts.COMPLETED, 2);
      assert.equal(first.statusCounts.PASSED, 1);
      assert.equal(first.statusCounts.FAILED, 1);
      assert.equal(first.statusCounts.PENDING, 26);
      assert.equal(first.results.length, 12);
      const second = await query(`cursor=${encodeURIComponent(first.nextCursor!)}`);
      const third = await query(`cursor=${encodeURIComponent(second.nextCursor!)}`);
      const rows = [...first.results, ...second.results, ...third.results];
      assert.equal(new Set(rows.map(row => row.id)).size, 28);
      assert.equal(third.nextCursor, null);
      assert.equal(rows.find(row => row.attemptNumber === 3)?.obtainedMarks, null);
      assert.equal(rows.find(row => row.attemptNumber === 3)?.scorePercent, null);
      assert.equal((await query("status=PASSED")).results[0].scorePercent, 50);
      assert.equal((await query("status=FAILED")).results[0].scorePercent, 0);
      assert.equal((await query("status=COMPLETED")).total, 2);
      assert.equal((await query("type=WRITTEN")).total, 1);
      assert.equal((await query(`batchId=${batch.id}`)).total, 28);
      assert.equal((await query("scope=BATCH")).total, 28);
      assert.equal((await query("scope=LEARNER")).total, 0);
      assert.equal((await query("batchId=somebody-elses-batch")).total, 0);
      assert.equal((await query("courseId=somebody-elses-course")).total, 0);
      assert.equal((await query("from=2020-01-02&to=2020-01-02")).total, 27);
      assert.equal((await query("to=2020-01-01")).total, 0);
      const options = await getLearnerResultFilterOptions(user.id, tx);
      assert.ok(options.batches.some(row => row.id === batch.id));
      assert.equal((await getLearnerAssessmentResults(outsider.id, parseResultFilters(new URLSearchParams()), tx)).total, 1);
      await tx.enrollment.updateMany({ where: { userId: user.id }, data: { status: "PENDING" } });
      assert.equal((await query()).total, 0);
      console.log("PASS: attempt pagination, status counts, unreleased score masking, passed/failed boundaries, historical membership, date boundaries, type/course filters, and learner isolation.");
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
