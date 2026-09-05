import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { decodeAssessmentCursor, type AssessmentListFilters, type AssessmentListResponse, type AssessmentListRow } from "@/lib/assessment-list";

// All visibility checks happen before pagination. A future assignment never overrides
// a currently available one; within each set use the same target priority as access policy.
export async function getLearnerAssessmentList(learnerId: string, filters: AssessmentListFilters, db: Prisma.TransactionClient = prisma): Promise<AssessmentListResponse> {
  const now = new Date();
  const base = Prisma.sql`
    WITH visible AS (
      SELECT a.id, a.title, a.type, a."totalMarks", a."passingMarks", a."courseId", a."createdAt",
        c.title AS "courseTitle", x."availableFrom", x."dueAt", x."targetType", x."attemptLimit", b.name AS "batchName",
        s.id AS "submissionId", s."obtainedMarks", COALESCE(s.attempts, 0)::int AS "attemptsUsed",
        CASE WHEN s.id IS NOT NULL AND s.status IN ('GRADED', 'REVIEWED') AND s."obtainedMarks" IS NOT NULL THEN 'COMPLETED'
          WHEN s.id IS NOT NULL AND s.status <> 'DRAFT' THEN 'PENDING'
          WHEN x.id IS NULL OR x."dueAt" <= ${now} THEN 'CLOSED'
          WHEN x."availableFrom" > ${now} THEN 'UPCOMING'
          ELSE 'AVAILABLE' END AS "listStatus"
      FROM assessments a JOIN courses c ON c.id = a."courseId"
      LEFT JOIN LATERAL (
        SELECT aa.id, aa."targetType", aa."attemptLimit", aa."dueAt", aa."batchId",
          GREATEST(aa."availableFrom", CASE WHEN aa."targetType" = 'BATCH' THEN ab."startDate" END) AS "availableFrom"
        FROM assessment_assignments aa LEFT JOIN batches ab ON ab.id = aa."batchId"
        WHERE aa."assessmentId" = a.id AND aa.status = 'PUBLISHED'
          AND (aa."targetType" = 'COURSE' OR (aa."targetType" = 'LEARNER' AND aa."learnerId" = ${learnerId})
            OR (aa."targetType" = 'BATCH' AND EXISTS (
              SELECT 1 FROM batches bt JOIN batch_memberships bm ON bm."batchId" = bt.id
              WHERE bt.id = aa."batchId" AND bt.status = 'ACTIVE' AND bm."userId" = ${learnerId} AND bm.status = 'ACTIVE'
                AND (bt."endDate" IS NULL OR bt."endDate" > ${now})
            )))
        ORDER BY (COALESCE(GREATEST(aa."availableFrom", CASE WHEN aa."targetType" = 'BATCH' THEN ab."startDate" END), '-infinity'::timestamp) <= ${now}) DESC,
          CASE aa."targetType" WHEN 'LEARNER' THEN 3 WHEN 'BATCH' THEN 2 ELSE 1 END DESC, aa."updatedAt" DESC, aa.id DESC
        LIMIT 1
      ) x ON true
      LEFT JOIN batches b ON b.id = x."batchId"
      LEFT JOIN LATERAL (
        SELECT sub.id, sub.status, sub."obtainedMarks", count(*) OVER () AS attempts
        FROM submissions sub WHERE sub."assessmentId" = a.id AND sub."userId" = ${learnerId}
        ORDER BY sub."attemptNumber" DESC LIMIT 1
      ) s ON true
      WHERE EXISTS (SELECT 1 FROM enrollments e WHERE e."courseId" = a."courseId" AND e."userId" = ${learnerId} AND e.status = 'APPROVED')
        AND (x.id IS NOT NULL OR s.id IS NOT NULL)
        ${filters.courseId ? Prisma.sql`AND a."courseId" = ${filters.courseId}` : Prisma.empty}
        ${filters.batchId ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM assessment_assignments ba JOIN batch_memberships bm ON bm."batchId" = ba."batchId"
          WHERE ba."assessmentId" = a.id AND ba.status = 'PUBLISHED' AND ba."targetType" = 'BATCH'
            AND ba."batchId" = ${filters.batchId} AND bm."userId" = ${learnerId} AND bm.status = 'ACTIVE'
        )` : Prisma.empty}
        ${filters.scope ? Prisma.sql`AND x."targetType"::text = ${filters.scope}` : Prisma.empty}
        ${filters.from ? Prisma.sql`AND COALESCE(x."availableFrom", a."createdAt") >= ${new Date(filters.from + 'T00:00:00+06:00')}` : Prisma.empty}
        ${filters.to ? Prisma.sql`AND COALESCE(x."availableFrom", a."createdAt") < ${new Date(new Date(filters.to + 'T00:00:00+06:00').getTime() + 86400000)}` : Prisma.empty}
    )`;
  const cursor = filters.cursor ? decodeAssessmentCursor(filters.cursor) : null;
  // Counts and page share one database snapshot and one round trip.
  const [result] = await db.$queryRaw<Array<{ rows: AssessmentListRow[]; counts: { type: string; status: string; count: number }[] }>>(Prisma.sql`
    ${base}
    SELECT COALESCE((SELECT jsonb_agg(p ORDER BY p."createdAt" DESC, p.id DESC) FROM (
      SELECT * FROM visible WHERE type::text = ${filters.type}
        ${filters.status !== 'ALL' ? Prisma.sql`AND "listStatus" = ${filters.status}` : Prisma.empty}
        ${cursor ? Prisma.sql`AND ("createdAt", id) < (${new Date(cursor.createdAt)}, ${cursor.id})` : Prisma.empty}
      ORDER BY "createdAt" DESC, id DESC LIMIT ${filters.pageSize + 1}
    ) p), '[]'::jsonb) AS rows,
    COALESCE((SELECT jsonb_agg(g) FROM (SELECT type, "listStatus" AS status, count(*)::int AS count FROM visible GROUP BY type, "listStatus") g), '[]'::jsonb) AS counts
  `);
  const typeCounts: Record<string, number> = {}, statusCounts: Record<string, number> = { ALL: 0 };
  for (const count of result.counts) {
    typeCounts[count.type] = (typeCounts[count.type] || 0) + count.count;
    if (count.type === filters.type) { statusCounts[count.status] = count.count; statusCounts.ALL += count.count; }
  }
  const utc = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + "Z";
  const assessments = result.rows.slice(0, filters.pageSize).map(row => ({ ...row,
    createdAt: utc(row.createdAt), availableFrom: row.availableFrom ? utc(row.availableFrom) : null,
    dueAt: row.dueAt ? utc(row.dueAt) : null,
  }));
  const last = assessments.at(-1);
  return { assessments, typeCounts, statusCounts, total: statusCounts[filters.status] || 0,
    nextCursor: result.rows.length > filters.pageSize && last ? btoa(JSON.stringify({ createdAt: last.createdAt, id: last.id })) : null };
}

export async function getLearnerAssessmentFilterOptions(learnerId: string) {
  const [courses, batches] = await Promise.all([
    prisma.course.findMany({ where: { enrollments: { some: { userId: learnerId, status: 'APPROVED' } } }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    prisma.batch.findMany({ where: { memberships: { some: { userId: learnerId, status: 'ACTIVE' } } }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  return { courses, batches };
}
