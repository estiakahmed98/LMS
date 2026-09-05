/** Real PostgreSQL checks. All users, certificates and sequences are rolled back. */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { listCertificateManagement, searchCertificateCourses } from "../lib/admin-certificate-list-server";
import { parseCertificateFilters } from "../lib/admin-certificate-list";
import { issueCertificateBatch } from "../lib/admin-certificate-server";
const template = { issuerName: "Test issuer", issuerCode: "TEST", borderColor: "#123456", fontFamily: "SERIF_FORMAL" as const, directorSignatureUrl: null, officialSealUrl: null };
async function main() {
  const rollback = new Error("ROLLBACK_CERTIFICATE_FIXTURES");
  try {
    await prisma.$transaction(async tx => {
      const tag = randomUUID();
      const course = await tx.course.create({ data: { title: `Certificate test ${tag}`, description: "Rollback fixture", durationHours: 1, level: "BEGINNER", status: "ARCHIVED" } });
      const user = await tx.user.create({ data: { name: `Learner_100% ${tag}`, email: `${tag}@example.invalid` } });
      const issueDate = new Date("2020-01-01T18:00:00.123Z");
      await tx.certificate.createMany({ data: Array.from({ length: 57 }, (_, index) => ({ ...template, id: `${tag}-certificate-${index}`, userId: user.id, courseId: course.id, issueDate, certificateNumber: `${tag}-${index}`, revokedAt: index < 7 ? new Date() : null })) });
      const query = (extra = "") => listCertificateManagement(parseCertificateFilters(new URLSearchParams(`courseId=${course.id}&${extra}`)), tx);
      const first = await query();
      assert.equal(first.total, 57); assert.equal(first.certificates.length, 25);
      assert.deepEqual(first.counts, { ALL: 57, VALID: 50, REVOKED: 7 });
      const second = await query(`cursor=${encodeURIComponent(first.nextCursor!)}`);
      const third = await query(`cursor=${encodeURIComponent(second.nextCursor!)}`);
      assert.equal(new Set([...first.certificates, ...second.certificates, ...third.certificates].map(row => row.id)).size, 57);
      assert.equal(third.nextCursor, null);
      assert.equal((await query('status=REVOKED')).total, 7);
      assert.equal((await query(`q=${encodeURIComponent('Learner_100%')}`)).total, 57);
      assert.equal((await query(`q=${encodeURIComponent(user.email.toUpperCase())}`)).total, 57);
      assert.equal((await query('q=missing')).total, 0);
      assert.equal((await query('from=2020-01-02&to=2020-01-02')).total, 57);
      assert.equal((await query('to=2020-01-01')).total, 0);
      assert.ok((await searchCertificateCourses(tag, tx)).courses.some(row => row.id === course.id));
      const issueCourse = await tx.course.create({ data: { title: `Issue test ${tag}`, description: "Rollback", durationHours: 1, level: "BEGINNER" } });
      await tx.user.createMany({ data: Array.from({ length: 105 }, (_, index) => ({ id: `${tag}-u-${index}`, name: "Bulk fixture", email: `${tag}-${index}@example.invalid` })) });
      await tx.enrollment.createMany({ data: Array.from({ length: 105 }, (_, index) => ({ userId: `${tag}-u-${index}`, courseId: issueCourse.id, status: "APPROVED", progress: 100 })) });
      const batch = await issueCertificateBatch(tx, issueCourse.id, 'COMPLETED', template);
      assert.equal(batch.issued, 100); assert.equal(batch.hasMore, true); assert.ok(batch.nextAfterUserId);
      // A separate DB connection cannot acquire the same course lock.
      const lock = await prisma.$transaction(async other => other.$queryRaw<Array<{ acquired: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtext(${"certificate-issue:" + issueCourse.id})) AS acquired`);
      assert.equal(lock[0].acquired, false);
      assert.deepEqual(await issueCertificateBatch(tx, issueCourse.id, 'COMPLETED', template, batch.nextAfterUserId!), { issued: 5, hasMore: false, nextAfterUserId: null });
      assert.deepEqual(await issueCertificateBatch(tx, issueCourse.id, 'COMPLETED', template), { issued: 0, hasMore: false, nextAfterUserId: null });
      await tx.certificate.updateMany({ where: { courseId: issueCourse.id }, data: { revokedAt: new Date() } });
      assert.equal((await issueCertificateBatch(tx, issueCourse.id, 'COMPLETED', template)).issued, 0);
      const passCourse = await tx.course.create({ data: { title: "Pass fixture", description: "Rollback", durationHours: 1, level: "BEGINNER" } });
      await tx.enrollment.create({ data: { courseId: passCourse.id, userId: user.id, status: 'APPROVED' } });
      const assessment = await tx.assessment.create({ data: { courseId: passCourse.id, title: "Pass fixture", type: 'MCQ', totalMarks: 10, passingMarks: 5 } });
      const submission = await tx.submission.create({ data: { userId: user.id, assessmentId: assessment.id, status: 'GRADING', obtainedMarks: 5 } });
      assert.equal((await issueCertificateBatch(tx, passCourse.id, 'PASS', template)).issued, 0);
      await tx.submission.update({ where: { id: submission.id }, data: { status: 'GRADED' } });
      assert.equal((await issueCertificateBatch(tx, passCourse.id, 'PASS', template)).issued, 1);
      console.log('PASS: pagination, counts, literal and case-insensitive search, dates, archived courses, 100-record issuance batches, repeat/revoked deduplication, cross-connection lock and PASS eligibility.');
      if (process.argv.includes('--scale')) {
        const scaleCourse = await tx.course.create({ data: { title: "Scale fixture", description: "100k rollback", durationHours: 1, level: "BEGINNER" } });
        const seedStart = performance.now();
        await tx.$executeRaw`INSERT INTO users (id, name, email, "createdAt", "updatedAt") SELECT ${tag + '-scale-'} || n, 'Scale learner ' || n, ${tag + '-scale-'} || n || '@example.invalid', NOW(), NOW() FROM generate_series(1, 100000) n`;
        await tx.$executeRaw`ANALYZE users`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '20s'`;
        for (let start = 1; start <= 100000; start += 1000) {
        await tx.$executeRaw`INSERT INTO certificates (id, "userId", "courseId", "certificateNumber", "issuerName", "issuerCode", "borderColor", "fontFamily", "issueDate", "createdAt", "updatedAt", "revokedAt")
          SELECT ${tag + '-scale-c-'} || n, ${tag + '-scale-'} || n, ${scaleCourse.id}, ${tag + '-number-'} || n, 'Scale test', 'TEST', '#123456', 'SERIF_FORMAL', timestamp '2016-01-01' + (n % 3653) * interval '1 day', NOW(), NOW(), CASE WHEN n % 10 = 0 THEN NOW() ELSE NULL END FROM generate_series(${start}::int, ${start + 999}::int) n`;
        if ((start + 999) % 20000 === 0) console.log(`Seeded ${start + 999} certificate fixtures...`);
        }
        await tx.$executeRaw`ANALYZE certificates`;
        console.log(`Scale fixtures: 100,000 users + 100,000 certificates across ten years, seeded in ${Math.round(performance.now() - seedStart)} ms.`);
        const timings: Record<string, number> = {};
        for (const [label, extra] of [['history', ''], ['valid', 'status=VALID'], ['revoked', 'status=REVOKED'], ['search', 'q=Scale%20learner%2099999'], ['dateRange', 'from=2025-01-01&to=2025-12-31']]) {
          const start = performance.now();
          const payload = await listCertificateManagement(parseCertificateFilters(new URLSearchParams(`courseId=${scaleCourse.id}&${extra}`)), tx);
          timings[label] = Math.round(performance.now() - start);
          assert.ok(payload.certificates.length <= 25);
          if (label === 'history') assert.equal(payload.total, 100000);
          if (label === 'search') assert.equal(payload.total, 1);
        }
        console.log(JSON.stringify({ singleRequestMilliseconds: timings, note: 'Local sequential checks, not a concurrency benchmark.' }));
      }
      throw rollback;
    }, { timeout: process.argv.includes('--scale') ? 180000 : 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally {
    if (process.argv.includes('--scale')) {
      await prisma.$executeRaw`ANALYZE users`;
      await prisma.$executeRaw`ANALYZE certificates`;
    }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
