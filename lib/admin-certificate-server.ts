import { auditLogEntry } from "@/lib/audit";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  AdminCertificateRow,
  CertificateEligibility,
  CertificateFont,
  CertificateTemplateValue,
} from "@/lib/admin-certificate-types";

const TEMPLATE_ID = "default";
const DEFAULT_ISSUER_NAME = "Professional Skills Training Center";
const DEFAULT_ISSUER_CODE = "PSTC";

const CERTIFICATE_SELECT = {
  id: true,
  certificateNumber: true,
  courseId: true,
  issueDate: true,
  issuerName: true,
  issuerCode: true,
  borderColor: true,
  fontFamily: true,
  directorSignatureUrl: true,
  officialSealUrl: true,
  revokedAt: true,
  revocationReason: true,
  supersedesId: true,
  user: { select: { name: true, email: true } },
  course: { select: { title: true } },
} as const;

type CertificateRecord = {
  id: string;
  certificateNumber: string;
  courseId: string;
  issueDate: Date;
  issuerName: string;
  issuerCode: string;
  borderColor: string;
  fontFamily: string;
  directorSignatureUrl: string | null;
  officialSealUrl: string | null;
  revokedAt: Date | null;
  revocationReason: string | null;
  supersedesId: string | null;
  user: { name: string; email: string };
  course: { title: string };
};

function toRow(certificate: CertificateRecord): AdminCertificateRow {
  return {
    id: certificate.id,
    certificateNumber: certificate.certificateNumber,
    student: certificate.user.name,
    studentEmail: certificate.user.email,
    course: certificate.course.title,
    courseId: certificate.courseId,
    issueDate: certificate.issueDate.toISOString(),
    status: certificate.revokedAt ? "REVOKED" : "VALID",
    revokedAt: certificate.revokedAt?.toISOString() ?? null,
    revocationReason: certificate.revocationReason,
  };
}

function snapshotFromCertificate(
  certificate: CertificateRecord,
): CertificateTemplateValue {
  return {
    issuerName: certificate.issuerName,
    issuerCode: certificate.issuerCode,
    borderColor: certificate.borderColor,
    fontFamily: certificate.fontFamily as CertificateFont,
    directorSignatureUrl: certificate.directorSignatureUrl,
    officialSealUrl: certificate.officialSealUrl,
  };
}

function snapshotData(template: CertificateTemplateValue) {
  return {
    issuerName: template.issuerName,
    issuerCode: template.issuerCode,
    borderColor: template.borderColor,
    fontFamily: template.fontFamily,
    directorSignatureUrl: template.directorSignatureUrl,
    officialSealUrl: template.officialSealUrl,
  };
}

async function reserveCertificateNumbers(
  tx: Prisma.TransactionClient,
  issuerCode: string,
  count: number,
  issueDate = new Date(),
) {
  if (count < 1) return [];
  const year = issueDate.getFullYear();
  const sequence = await tx.certificateSequence.upsert({
    where: { id: `${issuerCode}:${year}` },
    create: {
      id: `${issuerCode}:${year}`,
      issuerCode,
      year,
      current: count,
    },
    update: { current: { increment: count } },
    select: { current: true },
  });
  const first = sequence.current - count + 1;
  return Array.from(
    { length: count },
    (_, index) =>
      `${issuerCode}-${year}-${String(first + index).padStart(6, "0")}`,
  );
}

export async function getAdminCertificate(id: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { id },
    select: CERTIFICATE_SELECT,
  });
  return certificate
    ? toRow(certificate as CertificateRecord)
    : null;
}

export async function getAdminCertificateDetail(id: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { id },
    select: CERTIFICATE_SELECT,
  });
  if (!certificate) return null;
  const record = certificate as CertificateRecord;
  return {
    certificate: toRow(record),
    template: snapshotFromCertificate(record),
  };
}

export async function revokeCertificate(
  id: string,
  reason: string,
  actorId: string | null,
) {
  const cleanReason = reason.trim();
  if (!cleanReason) throw new Error("Revocation reason is required.");

  const existing = await prisma.certificate.findUnique({
    where: { id },
    select: { revokedAt: true },
  });
  if (!existing) throw new Error("Certificate not found.");
  if (existing.revokedAt) throw new Error("Certificate is already revoked.");

  const certificate = await prisma.certificate.update({
    where: { id },
    data: {
      revokedAt: new Date(),
      revocationReason: cleanReason,
    },
    select: CERTIFICATE_SELECT,
  });

  await auditLogEntry({
    actorId,
    action: "certificate.revoked",
    entity: "Certificate",
    entityId: id,
    changes: { reason: cleanReason },
  });
  return toRow(certificate as CertificateRecord);
}

export async function reissueCertificate(id: string, actorId: string | null) {
  const [existing, template] = await Promise.all([
    prisma.certificate.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        courseId: true,
        revokedAt: true,
        replacement: { select: { id: true } },
      },
    }),
    getCertificateTemplate(),
  ]);
  if (!existing) throw new Error("Certificate not found.");
  if (!existing.revokedAt) {
    throw new Error("Only a revoked certificate can be reissued.");
  }
  if (existing.replacement) {
    throw new Error("This certificate has already been reissued.");
  }

  const now = new Date();
  const certificate = await prisma.$transaction(async (tx) => {
    const [number] = await reserveCertificateNumbers(
      tx,
      template.issuerCode,
      1,
      now,
    );
    const replacement = await tx.certificate.create({
      data: {
        userId: existing.userId,
        courseId: existing.courseId,
        certificateNumber: number,
        issueDate: now,
        supersedesId: existing.id,
        ...snapshotData(template),
      },
      select: CERTIFICATE_SELECT,
    });
    await tx.certificate.update({
      where: { id: existing.id },
      data: { reissuedAt: now },
    });
    return replacement;
  });

  await auditLogEntry({
    actorId,
    action: "certificate.reissued",
    entity: "Certificate",
    entityId: certificate.id,
    changes: {
      supersedesId: existing.id,
      certificateNumber: certificate.certificateNumber,
    },
  });
  return toRow(certificate as CertificateRecord);
}

export async function bulkIssueCertificates(
  courseId: string,
  eligibility: CertificateEligibility,
  actorId: string | null,
  afterUserId = "",
) {
  if (eligibility !== "PASS" && eligibility !== "COMPLETED") {
    throw new Error("Eligibility must be PASS or COMPLETED.");
  }

  const [course, template] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    }),
    getCertificateTemplate(),
  ]);
  if (!course) throw new Error("Course not found.");

  const result = await prisma.$transaction(async tx => issueCertificateBatch(tx, courseId, eligibility, template, afterUserId), { timeout: 15000 });

  await auditLogEntry({
    actorId,
    action: "certificate.bulk_issued",
    entity: "Course",
    entityId: courseId,
    changes: {
      issuerCode: template.issuerCode,
      eligibility,
      issued: result.issued,
      hasMore: result.hasMore,
    },
  });

  return result;
}

// A batch is bounded to 100 new certificates. Repeating it resumes safely by
// excluding every existing certificate, including revoked ones. The course lock
// prevents concurrent bulk requests from issuing duplicates for the same learners.
export async function issueCertificateBatch(tx: Prisma.TransactionClient, courseId: string, eligibility: CertificateEligibility, template: CertificateTemplateValue, afterUserId = "") {
  const [lock] = await tx.$queryRaw<Array<{ acquired: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtext(${"certificate-issue:" + courseId})) AS acquired`;
  if (!lock.acquired) throw new Error("Another certificate batch is running for this course. Try again shortly.");
  const candidates = await tx.$queryRaw<Array<{ userId: string }>>(Prisma.sql`
    SELECT e."userId" FROM enrollments e
    WHERE e."courseId" = ${courseId} AND e.status = 'APPROVED'
      ${afterUserId ? Prisma.sql`AND e."userId" > ${afterUserId}` : Prisma.empty}
      AND NOT EXISTS (SELECT 1 FROM certificates c WHERE c."courseId" = e."courseId" AND c."userId" = e."userId")
      ${eligibility === 'COMPLETED' ? Prisma.sql`AND (e.progress >= 100 OR e."completedAt" IS NOT NULL)` : Prisma.sql`AND EXISTS (
        SELECT 1 FROM submissions s JOIN assessments a ON a.id = s."assessmentId"
        WHERE s."userId" = e."userId" AND a."courseId" = e."courseId" AND s.status IN ('GRADED', 'REVIEWED') AND s."obtainedMarks" >= a."passingMarks"
      )`}
    ORDER BY e."userId" LIMIT 101
  `);
  const batch = candidates.slice(0, 100);
  const now = new Date();
  if (batch.length) {
    const numbers = await reserveCertificateNumbers(tx, template.issuerCode, batch.length, now);
    await tx.certificate.createMany({ data: batch.map((row, index) => ({ userId: row.userId, courseId, issueDate: now, certificateNumber: numbers[index], ...snapshotData(template) })) });
  }
  return { issued: batch.length, hasMore: candidates.length > 100, nextAfterUserId: candidates.length > 100 ? batch[batch.length - 1].userId : null };
}

export async function getCertificateTemplate(): Promise<CertificateTemplateValue> {
  const template = await prisma.certificateTemplate.upsert({
    where: { id: TEMPLATE_ID },
    create: {
      id: TEMPLATE_ID,
      issuerName: DEFAULT_ISSUER_NAME,
      issuerCode: DEFAULT_ISSUER_CODE,
    },
    update: {},
  });
  return {
    issuerName: template.issuerName,
    issuerCode: template.issuerCode,
    borderColor: template.borderColor,
    fontFamily: template.fontFamily as CertificateFont,
    directorSignatureUrl: template.directorSignatureUrl,
    officialSealUrl: template.officialSealUrl,
  };
}

export async function updateCertificateTemplate(
  input: Partial<CertificateTemplateValue>,
  actorId: string | null,
) {
  const issuerName = input.issuerName?.trim();
  const issuerCode = input.issuerCode?.trim().toUpperCase();
  if (issuerName !== undefined && !issuerName) {
    throw new Error("Issuer name is required.");
  }
  if (
    issuerCode !== undefined &&
    !/^[A-Z0-9]{2,12}$/.test(issuerCode)
  ) {
    throw new Error(
      "Issuer code must contain 2-12 uppercase letters or numbers.",
    );
  }
  if (
    input.borderColor !== undefined &&
    !/^#[0-9a-f]{6}$/i.test(input.borderColor)
  ) {
    throw new Error("Border color must be a valid hex color.");
  }
  if (
    input.fontFamily !== undefined &&
    input.fontFamily !== "SERIF_FORMAL" &&
    input.fontFamily !== "SANS_MODERN"
  ) {
    throw new Error("Unsupported certificate font.");
  }

  const data = {
    ...(issuerName !== undefined ? { issuerName } : {}),
    ...(issuerCode !== undefined ? { issuerCode } : {}),
    ...(input.borderColor !== undefined
      ? { borderColor: input.borderColor }
      : {}),
    ...(input.fontFamily !== undefined
      ? { fontFamily: input.fontFamily }
      : {}),
    ...(input.directorSignatureUrl !== undefined
      ? { directorSignatureUrl: input.directorSignatureUrl }
      : {}),
    ...(input.officialSealUrl !== undefined
      ? { officialSealUrl: input.officialSealUrl }
      : {}),
  };
  const template = await prisma.certificateTemplate.upsert({
    where: { id: TEMPLATE_ID },
    create: {
      id: TEMPLATE_ID,
      issuerName: issuerName ?? DEFAULT_ISSUER_NAME,
      issuerCode: issuerCode ?? DEFAULT_ISSUER_CODE,
      ...data,
    },
    update: data,
  });

  await auditLogEntry({
    actorId,
    action: "certificate.template_updated",
    entity: "CertificateTemplate",
    entityId: TEMPLATE_ID,
    changes: input,
  });

  return {
    issuerName: template.issuerName,
    issuerCode: template.issuerCode,
    borderColor: template.borderColor,
    fontFamily: template.fontFamily as CertificateFont,
    directorSignatureUrl: template.directorSignatureUrl,
    officialSealUrl: template.officialSealUrl,
  };
}
