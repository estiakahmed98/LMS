"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  LearnerAssessmentListItem,
  LearnerAssessmentType,
} from "@/lib/learner-assessment-types";

type TabKey = LearnerAssessmentType;

const TABS: { key: TabKey; label: string }[] = [
  { key: "MCQ", label: "MCQ" },
  { key: "WRITTEN", label: "Written" },
  { key: "PRACTICAL", label: "Practical" },
  { key: "MIXED", label: "Mixed" },
];

export default function AssessmentsPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabKey>("MCQ");
  const [assessments, setAssessments] = useState<LearnerAssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssessments() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/learner/assessments", {
          cache: "no-store",
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load assessments.");
        }

        setAssessments(result.assessments || []);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load assessments.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadAssessments();
  }, []);

  const filteredAssessments = assessments.filter(
    (assessment) => assessment.type === activeTab,
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading assessments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center">
        <div>
          <h1 className="mb-2 text-xl font-bold">Failed to load assessments</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
          <FileText className="w-5 h-5" />
        </span>
        <h1 className="text-3xl font-bold">{t("assessmentsPage.title")}</h1>
      </div>

      <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const count = assessments.filter(
            (assessment) => assessment.type === tab.key,
          ).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs text-muted-foreground">
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssessments.map((assessment) => (
          <Link
            key={assessment.id}
            href={`/assessments/${assessment.id}`}
            className="flex flex-col gap-4 bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <p className="font-semibold text-card-foreground">
                  {assessment.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {assessment.course.title}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {assessment.questionCount} questions
              </span>
              <span className="text-muted-foreground">
                {assessment.totalMarks} marks
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-muted-foreground">
                {assessment.submission?.status ??
                  t("assessmentsPage.notStarted")}
              </span>
              <span className="font-semibold text-primary">
                {assessment.submission?.scorePercent !== null &&
                assessment.submission?.scorePercent !== undefined
                  ? `${assessment.submission.scorePercent}%`
                  : ""}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filteredAssessments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            {t("assessmentsPage.emptyState", {
              type: TABS.find((tab) => tab.key === activeTab)?.label.toLowerCase() ?? "",
            })}
          </p>
        </div>
      )}
    </>
  );
}
