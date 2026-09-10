import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getTrustedClientIp } from "@/lib/rate-limit";

const CERTIFICATE_NUMBER = /^[A-Z0-9][A-Z0-9-]{4,49}$/;

export async function POST(request: Request) {
  const limit = await checkRateLimit(
    "public-certificate-verification",
    { limit: 20, window: "10 m" },
    getTrustedClientIp(request.headers) ?? "anonymous",
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const body = await request.json().catch(() => null);
  const certificateNumber =
    typeof body?.certificateNumber === "string"
      ? body.certificateNumber.trim().toUpperCase()
      : "";

  if (!CERTIFICATE_NUMBER.test(certificateNumber)) {
    return NextResponse.json(
      { error: "Enter a valid certificate number." },
      { status: 400 },
    );
  }

  const certificate = await prisma.certificate.findUnique({
    where: { certificateNumber },
    select: {
      certificateNumber: true,
      issueDate: true,
      issuerName: true,
      borderColor: true,
      fontFamily: true,
      directorSignatureUrl: true,
      officialSealUrl: true,
      revokedAt: true,
      revocationReason: true,
      user: { select: { name: true } },
      course: { select: { title: true } },
      replacement: { select: { certificateNumber: true } },
    },
  });

  if (!certificate) {
    return NextResponse.json({ verified: false });
  }

  return NextResponse.json({
    verified: true,
    certificate: {
      number: certificate.certificateNumber,
      learner: certificate.user.name,
      course: certificate.course.title,
      issuer: certificate.issuerName,
      issuedAt: certificate.issueDate.toISOString(),
      borderColor: certificate.borderColor,
      fontFamily: certificate.fontFamily,
      directorSignatureUrl: certificate.directorSignatureUrl,
      officialSealUrl: certificate.officialSealUrl,
      status: certificate.revokedAt ? "REVOKED" : "VALID",
      revocationReason: certificate.revocationReason,
      replacementNumber: certificate.replacement?.certificateNumber ?? null,
    },
  });
}
