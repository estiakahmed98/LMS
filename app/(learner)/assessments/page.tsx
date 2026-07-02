"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getEnrollmentsByUserId,
  getAssessmentsByCourseId,
  getCourseById,
  getSubmissionsByUserId,
} from "@/lib/mock-data";
import { getCurrentUser } from "@/lib/auth";
import { FileText } from "lucide-react";
import type { AssessmentType } from "@/lib/mock-data";

const TABS: { key: AssessmentType; label: string }[] = [
  { key: "MCQ", label: "MCQ Assessment" },
  { key: "WRITTEN", label: "Written" },
  { key: "PRACTICAL", label: "Lab Report" },
];

export default function AssessmentsPage() {
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState<AssessmentType>("MCQ");

  const enrollments = getEnrollmentsByUserId(currentUser?.id ?? "").filter(
    (e) => e.status === "APPROVED",
  );
  const submissions = getSubmissionsByUserId(currentUser?.id ?? "");

  const allAssessments = enrollments.flatMap((enrollment) => {
    const course = getCourseById(enrollment.courseId);
    return getAssessmentsByCourseId(enrollment.courseId).map((assessment) => ({
      assessment,
      course,
    }));
  });

  const filteredAssessments = allAssessments.filter(
    ({ assessment }) => assessment.type === activeTab,
  );

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Assessments</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border mb-6">
        {TABS.map((tab) => {
          const count = allAssessments.filter(
            ({ assessment }) => assessment.type === tab.key,
          ).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
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
        {filteredAssessments.map(({ assessment, course }) => {
          const submission = submissions.find(
            (s) => s.assessmentId === assessment.id,
          );
          return (
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
                    {course?.title}
                  </p>
                </div>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {submission?.status ?? "Not Started"}
              </span>
            </Link>
          );
        })}
      </div>

      {filteredAssessments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}{" "}
            assigned yet.
          </p>
        </div>
      )}
    </>
  );
}
