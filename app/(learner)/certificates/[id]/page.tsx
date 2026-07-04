"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, Share2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  mockCertificates,
  mockSubmissions,
  mockAssessments,
  getUserById,
  getCourseById,
} from "@/lib/mock-data";

export default function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations();

  const certificate = mockCertificates.find((c) => c.id === id);
  if (!certificate) notFound();

  const student = getUserById(certificate.userId);
  const course = getCourseById(certificate.courseId);

  const courseAssessmentIds = mockAssessments
    .filter((a) => a.courseId === certificate.courseId)
    .map((a) => a.id);
  const gradedSubmission = mockSubmissions.find(
    (s) =>
      s.userId === certificate.userId &&
      s.status === "GRADED" &&
      courseAssessmentIds.includes(s.assessmentId) &&
      s.obtainedMarks !== undefined,
  );
  const assessment = gradedSubmission
    ? mockAssessments.find((a) => a.id === gradedSubmission.assessmentId)
    : undefined;
  const scorePercent =
    gradedSubmission && assessment
      ? Math.round(
          (gradedSubmission.obtainedMarks! / assessment.totalMarks) * 100,
        )
      : null;

  return (
    <div className="p-4">
      <Link
        href="/certificates"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft size={16} />
        {t("certificatesPage.backToCertificates")}
      </Link>

      <div className="mb-10 flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {t("certificatesPage.yourCertificate")}
        </h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            <Download className="w-4 h-4" />
            {t("certificatesPage.download")}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            <Share2 className="w-4 h-4" />
            {t("certificatesPage.share")}
          </button>
        </div>
      </div>

      {/* Certificate Display */}
      <div className="relative max-w-3xl mx-auto mt-6 border-4 border-primary rounded-lg bg-white p-10 text-center shadow-xl">
        <div className="border border-border/60 rounded-md p-10">
          <Image
            src="/pstc_logo.png"
            alt="PSTC"
            width={120}
            height={40}
            className="mx-auto mb-6 h-10 w-auto object-contain"
          />

          <h2 className="text-3xl font-serif font-bold tracking-wide text-gray-800 mb-6">
            {t("certificatesPage.completionTitle")}
          </h2>

          <p className="text-xs font-semibold text-muted-foreground mb-1">
            {t("certificatesPage.certificateId", {
              number: certificate.certificateNumber,
            })}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {t("certificatesPage.certifyThat")}
          </p>

          <p className="text-3xl font-bold text-primary mb-2 pb-4 border-b border-border/60 inline-block px-8">
            {student?.name ?? t("certificatesPage.student")}
          </p>

          <p className="text-sm text-muted-foreground mt-6 mb-2">
            {t("certificatesPage.hasCompleted")}
          </p>
          <p className="text-lg font-semibold text-gray-800 mb-2">
            {course?.title ?? t("certificatesPage.course")}
          </p>
          <p className="text-sm text-muted-foreground mb-10">
            {scorePercent !== null
              ? `${t("certificatesPage.withScoreOn", { score: scorePercent })} `
              : `${t("certificatesPage.on")} `}
            {new Date(certificate.issueDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          <div className="flex items-end justify-between mt-12">
            <div className="flex items-center gap-3">
              <div className="text-left">
                <p className="font-serif italic text-xl text-gray-700 leading-none">
                  M. A. Rahman
                </p>
                <div className="border-t border-gray-400 mt-1 pt-1">
                  <p className="text-xs text-muted-foreground">
                    {t("certificatesPage.programDirector")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center text-primary">
              <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <p className="text-[10px] font-semibold tracking-wide mt-1">
                {t("certificatesPage.verifiedBy")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
