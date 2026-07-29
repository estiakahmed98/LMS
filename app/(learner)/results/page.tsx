"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Eye,
  FileText,
  LoaderCircle,
  Trophy,
} from "lucide-react";
import type {
  LearnerAssessmentResultItem,
  LearnerAssessmentResultsPayload,
} from "@/lib/learner-assessment-types";
import { usePortalPermissions } from "@/components/portal/PortalPermissionsProvider";
import { useTranslations } from "next-intl";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanizeStatus(result: LearnerAssessmentResultItem) {
  if (result.scorePercent === null) return "pending";
  if (result.manualReviewStatus === "FINALIZED") return "finalized";
  return result.status.toLowerCase();
}

function resultTone(result: LearnerAssessmentResultItem) {
  if (result.scorePercent === null) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return result.obtainedMarks !== null && result.obtainedMarks >= result.passingMarks
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
}

export default function LearnerResultsPage() {
  const t = useTranslations("resultsPage");
  const { can } = usePortalPermissions();
  const canViewAssessments = can("ASSESSMENTS", "view");
  const [results, setResults] = useState<LearnerAssessmentResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/learner/results", {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as
          | LearnerAssessmentResultsPayload
          | { error?: string }
          | null;

        if (!response.ok) {
          const message =
            data && "error" in data ? data.error : t("loadError");
          throw new Error(message ?? t("loadError"));
        }

        setResults(data && "results" in data ? data.results : []);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : t("loadError"));
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    if (canViewAssessments) {
      void loadResults();
    } else {
      setLoading(false);
    }
  }, [canViewAssessments]);

  const groupedResults = useMemo(() => {
    const groups = new Map<string, LearnerAssessmentResultItem[]>();
    for (const result of results) {
      const current = groups.get(result.course.title) ?? [];
      current.push(result);
      groups.set(result.course.title, current);
    }
    return [...groups.entries()];
  }, [results]);

  if (!canViewAssessments) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 text-xl font-bold">{t("accessDeniedTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("accessDenied")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-primary" />
            {t("resultCount", { count: results.length })}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-80 items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
          {t("loading")}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : groupedResults.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold text-card-foreground">
            {t("emptyTitle")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("emptyMessage")}
          </p>
        </div>
      ) : (
        groupedResults.map(([courseTitle, courseResults]) => (
          <section
            key={courseTitle}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="border-b border-border bg-muted/40 px-5 py-4">
              <h2 className="font-bold text-card-foreground">{courseTitle}</h2>
              <p className="text-xs text-muted-foreground">
                {t("courseResultCount", { count: courseResults.length })}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="border-b border-border bg-muted/60">
                  <tr>
                    {[
                      t("table.assessment"),
                      t("table.type"),
                      t("table.status"),
                      t("table.score"),
                      t("table.marks"),
                      t("table.submitted"),
                      t("table.action"),
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courseResults.map((result) => (
                    <tr key={result.id} className="hover:bg-muted/30">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-card-foreground">
                          {result.assessmentTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("passMarks", { marks: result.passingMarks })}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold">
                          {result.assessmentType}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${resultTone(result)}`}
                        >
                          {t(`status.${humanizeStatus(result)}`)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold">
                        {result.scorePercent !== null
                          ? `${result.scorePercent}%`
                          : t("pending")}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {result.obtainedMarks !== null
                          ? `${result.obtainedMarks}/${result.totalMarks}`
                          : `${t("pending")}/${result.totalMarks}`}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatDate(result.submittedAt) ?? t("notSubmitted")}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/assessments/${result.assessmentId}/result?submissionId=${result.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("view")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
