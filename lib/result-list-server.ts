import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { decodeAssessmentCursor } from "@/lib/assessment-list";
import type { ResultListFilters, ResultListResponse, ResultListRow } from "@/lib/result-list";

export async function getLearnerAssessmentResults(
  learnerId: string,
  filters: ResultListFilters,
  db: Prisma.TransactionClient = prisma,
): Promise<ResultListResponse> {
  // A submission has no assignment snapshot. Scope filters match retained assignments
  // and the learner's memberships, including past memberships for historical results.
  const assignmentFilter = filters.batchId || filters.scope ? Prisma.sql`AND EXISTS (
    SELECT 1 FROM assessment_assignments aa
    WHERE aa."assessmentId" = a.id AND aa.status <> 'DRAFT'
      AND (aa."targetType" = 'COURSE'
        OR (aa."targetType" = 'LEARNER' AND aa."learnerId" = ${learnerId})
        OR (aa."targetType" = 'BATCH' AND EXISTS (
          SELECT 1 FROM batch_memberships bm WHERE bm."batchId" = aa."batchId" AND bm."userId" = ${learnerId}
        )))
      ${filters.batchId ? Prisma.sql`AND aa."targetType" = 'BATCH' AND aa."batchId" = ${filters.batchId}` : Prisma.empty}
      ${filters.scope ? Prisma.sql`AND aa."targetType"::text = ${filters.scope}` : Prisma.empty}
  )` : Prisma.empty;
  const visible = Prisma.sql`WITH visible AS (
    SELECT s.id, s."assessmentId", s."attemptNumber", s.status, s."manualReviewStatus",
      s."submittedAt", s."createdAt", a.title AS "assessmentTitle", a.type AS "assessmentType",
      a."totalMarks", a."passingMarks", jsonb_build_object('id', c.id, 'title', c.title) AS course,
      CASE WHEN s.status IN ('GRADED', 'REVIEWED') THEN s."obtainedMarks" ELSE NULL END AS "obtainedMarks",
      CASE WHEN s.status IN ('GRADED', 'REVIEWED') AND s."obtainedMarks" IS NOT NULL
        THEN CASE WHEN s."obtainedMarks" >= a."passingMarks" THEN 'PASSED' ELSE 'FAILED' END
        ELSE 'PENDING' END AS "resultStatus"
    FROM submissions s JOIN assessments a ON a.id = s."assessmentId" JOIN courses c ON c.id = a."courseId"
    WHERE s."userId" = ${learnerId} AND s.status <> 'DRAFT'
      AND EXISTS (SELECT 1 FROM enrollments e WHERE e."courseId" = a."courseId" AND e."userId" = ${learnerId} AND e.status = 'APPROVED')
      ${filters.courseId ? Prisma.sql`AND a."courseId" = ${filters.courseId}` : Prisma.empty}
      ${assignmentFilter}
      ${filters.from ? Prisma.sql`AND s."submittedAt" >= ${new Date(filters.from + 'T00:00:00+06:00')}` : Prisma.empty}
      ${filters.to ? Prisma.sql`AND s."submittedAt" < ${new Date(new Date(filters.to + 'T00:00:00+06:00').getTime() + 86400000)}` : Prisma.empty}
  )`;
  const cursor = filters.cursor ? decodeAssessmentCursor(filters.cursor) : null;
  const statusFilter = filters.status === "ALL" ? Prisma.empty : filters.status === "COMPLETED"
    ? Prisma.sql`AND "resultStatus" IN ('PASSED', 'FAILED')`
    : Prisma.sql`AND "resultStatus" = ${filters.status}`;
  const [payload] = await db.$queryRaw<Array<{
    rows: ResultListRow[];
    counts: { type: string; status: string; count: number }[];
  }>>(Prisma.sql`
    ${visible}
    SELECT COALESCE((SELECT jsonb_agg(p ORDER BY p."createdAt" DESC, p.id DESC) FROM (
      SELECT * FROM visible WHERE "assessmentType"::text = ${filters.type} ${statusFilter}
        ${cursor ? Prisma.sql`AND ("createdAt", id) < (${new Date(cursor.createdAt)}, ${cursor.id})` : Prisma.empty}
      ORDER BY "createdAt" DESC, id DESC LIMIT ${filters.pageSize + 1}
    ) p), '[]'::jsonb) AS rows,
    COALESCE((SELECT jsonb_agg(g) FROM (
      SELECT "assessmentType" AS type, "resultStatus" AS status, count(*)::int AS count
      FROM visible GROUP BY "assessmentType", "resultStatus"
    ) g), '[]'::jsonb) AS counts
  `);
  const typeCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = { ALL: 0, COMPLETED: 0 };
  for (const item of payload.counts) {
    typeCounts[item.type] = (typeCounts[item.type] || 0) + item.count;
    if (item.type === filters.type) {
      statusCounts.ALL += item.count;
      statusCounts[item.status] = item.count;
      if (item.status !== 'PENDING') statusCounts.COMPLETED += item.count;
    }
  }
  const utc = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + "Z";
  const results = payload.rows.slice(0, filters.pageSize).map(row => ({
    ...row,
    createdAt: utc(row.createdAt),
    submittedAt: row.submittedAt ? utc(row.submittedAt) : null,
    scorePercent: row.obtainedMarks !== null && row.totalMarks > 0 ? Math.round(row.obtainedMarks / row.totalMarks * 100) : null,
  }));
  const last = results.at(-1);
  return { results, typeCounts, statusCounts, total: statusCounts[filters.status] || 0,
    nextCursor: payload.rows.length > filters.pageSize && last ? btoa(JSON.stringify({ createdAt: last.createdAt, id: last.id })) : null };
}

export async function getLearnerResultFilterOptions(learnerId: string, db: Prisma.TransactionClient = prisma) {
  const [courses, batches] = await Promise.all([
    db.course.findMany({ where: { enrollments: { some: { userId: learnerId, status: 'APPROVED' } } }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    db.batch.findMany({ where: { memberships: { some: { userId: learnerId } } }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  return { courses, batches };
}
