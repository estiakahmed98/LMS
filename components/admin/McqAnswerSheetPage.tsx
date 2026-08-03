"use client";

import AdminLayout from "@/components/AdminLayout";
import type { AdminMcqAnswerSheet } from "@/lib/admin-report-types";
import { ArrowLeft, CheckCircle2, Printer, XCircle } from "lucide-react";
import Link from "next/link";

const optionLabels = ["A", "B", "C", "D", "E", "F"];

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function resultLabel(passed: boolean | null, status: string) {
  if (passed === true) return "Passed";
  if (passed === false) return "Failed";
  return status;
}

export default function McqAnswerSheetPage({
  sheet,
  canExport,
  backHref = "/admin/reports",
  wrapInAdminLayout = true,
}: {
  sheet: AdminMcqAnswerSheet;
  canExport: boolean;
  backHref?: string;
  wrapInAdminLayout?: boolean;
}) {
  function handlePrint() {
    if (!canExport) return;
    const previousTitle = document.title;
    document.title = `${sheet.student} - ${sheet.assessment} Answer Sheet`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  const content = (
    <>
      <PrintableAnswerSheet sheet={sheet} />

      <div className="space-y-6 p-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Link>

          {canExport ? (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
          ) : null}
        </div>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">
                MCQ Answer Sheet
              </p>
              <h1 className="mt-1 text-2xl font-bold text-card-foreground">
                {sheet.student}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {sheet.email}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Result
              </p>
              <p className="mt-1 text-lg font-bold">
                {resultLabel(sheet.passed, sheet.status)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <InfoCard label="Assessment" value={sheet.assessment} />
            <InfoCard label="Course" value={sheet.course} />
            <InfoCard
              label="Score"
              value={
                sheet.obtainedMarks === null
                  ? "Pending"
                  : `${sheet.obtainedMarks}/${sheet.totalMarks}`
              }
            />
            <InfoCard
              label="Submitted"
              value={formatDate(sheet.submittedAt)}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-card-foreground">
              Questions and Answers
            </h2>
            <p className="text-sm text-muted-foreground">
              {sheet.correct}/{sheet.questionCount} correct, {sheet.answered}/
              {sheet.questionCount} answered.
            </p>
          </div>

          <div className="divide-y divide-border">
            {sheet.questions.map((question, index) => (
              <QuestionReview
                key={question.id}
                question={question}
                index={index}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );

  if (!wrapInAdminLayout) return content;

  return <AdminLayout title="MCQ Answer Sheet">{content}</AdminLayout>;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-card-foreground">
        {value}
      </p>
    </div>
  );
}

function QuestionReview({
  question,
  index,
}: {
  question: AdminMcqAnswerSheet["questions"][number];
  index: number;
}) {
  return (
    <article className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="max-w-3xl text-sm font-semibold text-card-foreground">
          {index + 1}. {question.question}
        </h3>
        <span className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-semibold">
          {question.awardedMarks}/{question.marks}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {question.options.map((option, optionIndex) => {
          const isSelected = option === question.selectedAnswer;
          const isCorrect = option === question.correctAnswer;
          return (
            <div
              key={`${question.id}-${optionIndex}`}
              className={`rounded-lg border px-3 py-2 text-sm ${
                isCorrect
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : isSelected
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-border bg-background"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="font-semibold">
                  {optionLabels[optionIndex] ?? optionIndex + 1}.
                </span>
                <span className="flex-1">{option}</span>
                {isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : isSelected ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
        <p>Selected: {question.selectedAnswer ?? "Not answered"}</p>
        <p>Correct: {question.correctAnswer ?? "Not set"}</p>
        <p>{question.isCorrect ? "Correct" : "Incorrect"}</p>
      </div>
    </article>
  );
}

function PrintableAnswerSheet({ sheet }: { sheet: AdminMcqAnswerSheet }) {
  return (
    <div className="question-paper-print hidden bg-white text-black print:block print:p-6">
      <header className="border-b-2 border-black pb-4 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          {sheet.course}
        </h1>
        <h2 className="mt-1 text-lg font-semibold">{sheet.assessment}</h2>
        <p className="mt-2 text-sm">MCQ Answer Sheet</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-left text-sm">
          <p>
            <span className="font-bold">Student:</span> {sheet.student}
          </p>
          <p>
            <span className="font-bold">Email:</span> {sheet.email}
          </p>
          <p>
            <span className="font-bold">Submitted:</span>{" "}
            {formatDate(sheet.submittedAt)}
          </p>
          <p>
            <span className="font-bold">Result:</span>{" "}
            {resultLabel(sheet.passed, sheet.status)}
          </p>
          <p>
            <span className="font-bold">Score:</span>{" "}
            {sheet.obtainedMarks ?? "Pending"} / {sheet.totalMarks}
          </p>
          <p>
            <span className="font-bold">Correct:</span> {sheet.correct} /{" "}
            {sheet.questionCount}
          </p>
        </div>
      </header>

      <ol className="mt-6 space-y-6">
        {sheet.questions.map((question, index) => (
          <li key={question.id} className="break-inside-avoid">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">
                <span className="font-bold">{index + 1}. </span>
                {question.question}
              </p>
              <span className="shrink-0 whitespace-nowrap text-xs font-semibold">
                [{question.awardedMarks}/{question.marks} marks]
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 pl-6 text-sm">
              {question.options.map((option, optionIndex) => {
                const isSelected = option === question.selectedAnswer;
                const isCorrect = option === question.correctAnswer;
                const isWrongSelected = isSelected && !isCorrect;
                return (
                  <p
                    key={`${question.id}-print-${optionIndex}`}
                    className={[
                      "rounded px-1 py-0.5",
                      isCorrect
                        ? "mcq-print-correct bg-green-100 font-semibold text-green-800"
                        : "",
                      isWrongSelected
                        ? "mcq-print-wrong bg-red-100 font-semibold text-red-800"
                        : "",
                    ].join(" ")}
                  >
                    {optionLabels[optionIndex] ?? optionIndex + 1}. {option}
                    {isCorrect ? " [Correct]" : ""}
                    {isSelected ? " [Selected]" : ""}
                  </p>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
