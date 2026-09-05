import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { decodeCertificateCursor, type CertificateListFilters, type CertificateListPayload } from "@/lib/admin-certificate-list";
import type { AdminCertificateRow } from "@/lib/admin-certificate-types";

export async function listCertificateManagement(filters: CertificateListFilters, db: Prisma.TransactionClient = prisma): Promise<CertificateListPayload> {
  const cursor = filters.cursor ? decodeCertificateCursor(filters.cursor) : null;
  const search = `%${filters.q.replace(/[\\%_]/g, value => `\\${value}`)}%`;
  const base = Prisma.sql`WITH matching AS (
    SELECT c.id, c."issueDate", CASE WHEN c."revokedAt" IS NULL THEN 'VALID' ELSE 'REVOKED' END AS status
    FROM certificates c
    WHERE true
      ${filters.courseId ? Prisma.sql`AND c."courseId" = ${filters.courseId}` : Prisma.empty}
      ${filters.from ? Prisma.sql`AND c."issueDate" >= ${new Date(filters.from + 'T00:00:00+06:00')}` : Prisma.empty}
      ${filters.to ? Prisma.sql`AND c."issueDate" < ${new Date(new Date(filters.to + 'T00:00:00+06:00').getTime() + 86400000)}` : Prisma.empty}
      ${filters.q ? Prisma.sql`AND (c."certificateNumber" ILIKE ${search} OR c."userId" IN (SELECT id FROM users WHERE name ILIKE ${search} OR email ILIKE ${search}))` : Prisma.empty}
  )`;
  const [payload] = await db.$queryRaw<Array<{ rows: AdminCertificateRow[]; valid: number; revoked: number }>>(Prisma.sql`
    ${base}
    SELECT COALESCE((SELECT jsonb_agg(row ORDER BY row."issueDate" DESC, row.id DESC) FROM (
      SELECT c.id, c."certificateNumber", c."courseId", c."issueDate", c."revokedAt", c."revocationReason", c."reissuedAt",
        u.name AS student, u.email AS "studentEmail", co.title AS course, p.status
      FROM (
        SELECT * FROM matching WHERE true
          ${filters.status !== 'ALL' ? Prisma.sql`AND status = ${filters.status}` : Prisma.empty}
          ${cursor ? Prisma.sql`AND ("issueDate", id) < (${new Date(cursor.issueDate)}, ${cursor.id})` : Prisma.empty}
        ORDER BY "issueDate" DESC, id DESC LIMIT ${filters.pageSize + 1}
      ) p JOIN certificates c ON c.id = p.id JOIN users u ON u.id = c."userId" JOIN courses co ON co.id = c."courseId"
    ) row), '[]'::jsonb) AS rows,
      (SELECT count(*)::int FROM matching WHERE status = 'VALID') AS valid,
      (SELECT count(*)::int FROM matching WHERE status = 'REVOKED') AS revoked
  `);
  const utc = (value: string) => value.endsWith('Z') ? value : value + 'Z';
  const certificates = payload.rows.slice(0, filters.pageSize).map(row => ({ ...row,
    issueDate: utc(row.issueDate), revokedAt: row.revokedAt ? utc(row.revokedAt) : null,
    reissuedAt: row.reissuedAt ? utc(row.reissuedAt) : null,
  }));
  const counts = { ALL: payload.valid + payload.revoked, VALID: payload.valid, REVOKED: payload.revoked };
  const last = certificates.at(-1);
  return { certificates, counts, total: counts[filters.status], nextCursor: payload.rows.length > filters.pageSize && last ? btoa(JSON.stringify({ issueDate: last.issueDate, id: last.id })) : null };
}

export async function searchCertificateCourses(q: string, db: Prisma.TransactionClient = prisma) {
  if (q.length > 100) throw new Error("Course search is too long.");
  const rows = await db.course.findMany({ where: q ? { title: { contains: q, mode: 'insensitive' } } : {}, select: { id: true, title: true }, orderBy: [{ title: 'asc' }, { id: 'asc' }], take: 31 });
  return { courses: rows.slice(0, 30), hasMore: rows.length > 30 };
}
