"use client";

import AdminLayout from "@/components/AdminLayout";
import { adminStudents, type AdminStudentStatus } from "@/lib/admin-panel-data";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Award,
  Calendar,
  Download,
  Mail,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function statusClass(status: AdminStudentStatus) {
  if (status === "Active") return "border-green-200 bg-green-50 text-green-700";
  if (status === "Completed") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export default function StudentDetailPage({
  studentId,
}: {
  studentId: string;
}) {
  const t = useTranslations("adminStudentsPage");
  const tAdmin = useTranslations("admin");
  const router = useRouter();
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);

  const student = adminStudents.find((item) => item.id === studentId);

  function getCourseLabel(value: string) {
    switch (value) {
      case "Community Paramedic":
        return t("filters.courseOptions.communityParamedic");
      case "HR & Recruitment":
        return t("filters.courseOptions.hrRecruitment");
      case "Public Health Essentials":
        return t("filters.courseOptions.publicHealthEssentials");
      default:
        return value;
    }
  }

  function getStatusLabel(value: AdminStudentStatus) {
    switch (value) {
      case "Active":
        return t("status.active");
      case "Completed":
        return t("status.completed");
      case "Suspended":
        return t("status.suspended");
    }
  }

  function getAssessmentLabel(value: string) {
    switch (value) {
      case "MCQ - Module 1":
        return t("assessmentLabels.mcqModule1");
      case "Written - Module 2":
        return t("assessmentLabels.writtenModule2");
      case "Practical - Module 3":
        return t("assessmentLabels.practicalModule3");
      case "MCQ - Module 4":
        return t("assessmentLabels.mcqModule4");
      case "Written - Module 1":
        return t("assessmentLabels.writtenModule1");
      case "Lab Report - Module 3":
        return t("assessmentLabels.labReportModule3");
      default:
        return value;
    }
  }

  function getScoreLabel(value: string) {
    if (value === "Pending") return t("scoreLabels.pending");
    if (value === "Reviewed") return t("scoreLabels.reviewed");
    return value;
  }

  if (!student) {
    return (
      <AdminLayout title={tAdmin("students")}>
        <div className="space-y-4 p-6">
          <button
            onClick={() => router.push("/admin/students")}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("detailPage.back")}
          </button>
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            {t("detailPage.notFound")}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={tAdmin("students")}>
      <div className="space-y-6 p-6">
        <Link
          href="/admin/students"
          className="flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detailPage.back")}
        </Link>

        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm text-muted-foreground">
                {student.id}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-card-foreground">
                {student.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {student.email}
                </span>
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {student.phone}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("detailPage.enrolledOn", { date: student.enrolledAt })}
                </span>
              </div>
            </div>
            <span
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${statusClass(student.status)}`}
            >
              {getStatusLabel(student.status)}
            </span>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {t("detailPage.progress")}
            </p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">
              {numberFormatter.format(student.progress)}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {t("table.courses")}
            </p>
            <p className="mt-1 text-sm font-semibold text-card-foreground">
              {student.courses.map(getCourseLabel).join(", ")}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {t("table.lastActive")}
            </p>
            <p className="mt-1 text-sm font-semibold text-card-foreground">
              {student.lastActive}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold text-card-foreground">
              {t("detail.assessmentScores")}
            </h2>
            <div className="mt-3 divide-y divide-border">
              {student.scores.length > 0 ? (
                student.scores.map((score) => (
                  <div
                    key={`${score.assessment}-${score.score}`}
                    className="grid grid-cols-[1fr_90px] gap-3 py-2.5 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {getAssessmentLabel(score.assessment)}
                    </span>
                    <span className="font-semibold">
                      {getScoreLabel(score.score)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-2 text-sm text-muted-foreground">
                  {t("detailPage.noScores")}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Award className="h-4 w-4 text-primary" />
              {t("detail.certificates")}
            </h2>
            <div className="mt-3 space-y-2">
              {student.certificates.length > 0 ? (
                student.certificates.map((certificate) => (
                  <button
                    key={certificate}
                    className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                  >
                    <Download className="h-4 w-4 text-primary" />
                    {certificate}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("detail.noCertificate")}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
