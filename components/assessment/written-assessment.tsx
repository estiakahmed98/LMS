"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Timer,
  Cloud,
  Bold,
  Italic,
  Underline,
  List,
  Quote,
  CheckCircle2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Assessment, Question } from "@/lib/mock-data";
import StatusPill, { type QuestionStatus } from "./status-pill";
import CameraViewfinder from "./camera-viewfinder";
import PageThumbnailGrid from "./page-thumbnail-grid";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

const MIN_WORDS = 120;

export default function WrittenAssessment({
  assessment,
  questions,
  userId,
}: {
  assessment: Assessment;
  questions: Question[];
  userId: string;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [mode, setMode] = useState<"digital" | "scan">("digital");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-6">
          <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto" />
          <h1 className="text-3xl font-bold text-card-foreground">
            {t("assessmentTaking.written.submittedTitle")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("assessmentTaking.written.submittedMessage")}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold"
          >
            {t("assessmentTaking.written.returnToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 mb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1 order-1 sm:order-2 sm:shrink-0">
          <button
            onClick={() => setMode("digital")}
            className={`flex-1 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors sm:flex-none ${
              mode === "digital"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <span className="sm:hidden">{t("assessmentTaking.written.digitalTab")}</span>
            <span className="hidden sm:inline">{t("assessmentTaking.written.digitalModeTab")}</span>
          </button>
          <button
            onClick={() => setMode("scan")}
            className={`flex-1 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors sm:flex-none ${
              mode === "scan"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <span className="sm:hidden">{t("assessmentTaking.written.scanTab")}</span>
            <span className="hidden sm:inline">{t("assessmentTaking.written.physicalScanModeTab")}</span>
          </button>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold order-2 sm:order-1">
          {assessment.title}
        </h1>
      </div>
      <p className="text-muted-foreground mb-8">
        {t("assessmentTaking.marksSummary", {
          marks: assessment.totalMarks,
          passingMarks: assessment.passingMarks,
        })}
      </p>

      {mode === "digital" ? (
      <WrittenDigitalMode
        questions={questions}
        submitting={submitting}
        onSubmit={async (answers) => {
          setSubmitting(true);
          try {
            const response = await fetch(`/api/learner/assessments/${assessment.id}/submit`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                kind: "WRITTEN",
                mode: "DIGITAL",
                answers,
              }),
            });
            const result = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(result?.error || "Failed to submit assessment.");
            }
            router.push(`/assessments/${assessment.id}/result?submissionId=${result.submission.id}`);
            setSubmitted(true);
          } finally {
            setSubmitting(false);
          }
        }}
      />
    ) : (
      <WrittenScanMode
        submitting={submitting}
        onSubmit={async (pages) => {
          setSubmitting(true);
          try {
            const response = await fetch(`/api/learner/assessments/${assessment.id}/submit`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                kind: "WRITTEN",
                mode: "SCAN",
                attachments: pages,
              }),
            });
            const result = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(result?.error || "Failed to submit assessment.");
            }
            router.push(`/assessments/${assessment.id}/result?submissionId=${result.submission.id}`);
            setSubmitted(true);
          } finally {
            setSubmitting(false);
          }
        }}
      />
    )}
    </div>
  );
}

function WrittenDigitalMode({
  questions,
  submitting,
  onSubmit,
}: {
  questions: Question[];
  submitting: boolean;
  onSubmit: (answers: Record<string, string>) => Promise<void>;
}) {
  const t = useTranslations();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState(questions[0]?.id);
  const [secondsLeft, setSecondsLeft] = useState(45 * 60);
  const [autosaveState, setAutosaveState] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  function handleChange(text: string) {
    if (!activeId) return;
    setDrafts((prev) => ({ ...prev, [activeId]: text }));
    setAutosaveState("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => setAutosaveState("saved"), 800);
  }

  function statusFor(id: string): QuestionStatus {
    const text = drafts[id]?.trim() ?? "";
    if (id === activeId) return "IN_PROGRESS";
    if (text.length > 0) return "ANSWERED";
    return "NOT_STARTED";
  }

  const activeText = activeId ? (drafts[activeId] ?? "") : "";
  const wordCount = activeText.trim()
    ? activeText.trim().split(/\s+/).length
    : 0;
  const allAnswered = questions.every(
    (q) => (drafts[q.id]?.trim().split(/\s+/).length ?? 0) >= MIN_WORDS,
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4 bg-card border border-border rounded-lg px-4 py-3 mb-6 flex-wrap">
        <p className="text-sm font-semibold text-card-foreground">
          {t("assessmentTaking.written.writtenExamination")}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <Cloud className="w-4 h-4" />
            {autosaveState === "saving"
              ? t("assessmentTaking.written.saving")
              : t("assessmentTaking.written.savedRecently")}
          </div>
          <div className="flex items-center gap-1.5 text-destructive font-bold tabular-nums">
            <Timer className="w-4 h-4" />
            {formatTime(secondsLeft)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("assessmentTaking.written.examQuestions")}
          </p>
          {questions.map((q, index) => {
            const status = statusFor(q.id);
            const isActive = q.id === activeId;
            return (
              <button
                key={q.id}
                onClick={() => setActiveId(q.id)}
                className={`w-full text-left bg-card border rounded-lg p-4 transition-colors ${
                  isActive
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-bold text-card-foreground">
                    {t("assessmentTaking.written.questionShortWithMarks", {
                      number: index + 1,
                      marks: q.marks,
                    })}
                  </span>
                  <StatusPill status={status} />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {q.question}
                </p>
              </button>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-lg p-5 flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {activeId
              ? t("assessmentTaking.written.yourAnswerWithQuestion", {
                  number: questions.findIndex((q) => q.id === activeId) + 1,
                })
              : t("assessmentTaking.written.yourAnswer")}
          </p>
          <div className="flex items-center gap-3 border border-border rounded-t-lg px-3 py-2 bg-muted text-muted-foreground">
            <Bold className="w-4 h-4" />
            <Italic className="w-4 h-4" />
            <Underline className="w-4 h-4" />
            <List className="w-4 h-4" />
            <Quote className="w-4 h-4" />
          </div>
          <textarea
            value={activeText}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t("assessmentTaking.written.answerPlaceholder")}
            className="flex-1 min-h-70 border border-t-0 border-border rounded-b-lg p-4 text-sm text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {t("assessmentTaking.written.wordCountSummary", {
              count: wordCount,
              min: MIN_WORDS,
            })}
          </p>

          <button
            disabled={!allAnswered || submitting}
            onClick={() => onSubmit(drafts)}
            className="mt-4 w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? t("assessmentTaking.written.saving")
              : t("assessmentTaking.written.submitWrittenExam")}
          </button>
        </div>
      </div>
    </div>
  );
}

function WrittenScanMode({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (pages: string[]) => Promise<void>;
}) {
  const t = useTranslations();
  const [pages, setPages] = useState<string[]>([]);

  function addPage(dataUrl: string) {
    setPages((prev) => [...prev, dataUrl]);
  }

  function removePage(index: number) {
    setPages((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        {t("assessmentTaking.written.scanIntro")}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-card-foreground mb-3">
            {t("assessmentTaking.written.cameraViewfinderTitle")}
          </h3>
          <CameraViewfinder
            label={t("assessmentTaking.written.alignPageInFrame")}
            onCapture={addPage}
            outline="lines"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {t("assessmentTaking.written.edgeDetectionNote")}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-card-foreground mb-3">
            {t("assessmentTaking.written.multiPageCompilerTitle")}
          </h3>
          <PageThumbnailGrid
            pages={pages}
            onAdd={addPage}
            onRemove={removePage}
            labelPrefix="Page "
          />
          <p className="text-xs text-muted-foreground mt-2">
            {t("assessmentTaking.written.pagesAddedSummary", {
              count: pages.length,
              plural: pages.length !== 1 ? "s" : "",
            })}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-bold text-card-foreground mb-3">
          {t("assessmentTaking.written.verificationGalleryTitle")}
        </h3>
        <PageThumbnailGrid
          pages={pages}
          onRemove={removePage}
          labelPrefix="P"
        />
        <p className="text-xs text-muted-foreground mt-3 mb-4">
          {t("assessmentTaking.written.verificationNote")}
        </p>
        <button
          disabled={pages.length === 0 || submitting}
          onClick={() => onSubmit(pages)}
          className="w-full px-6 py-3 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? t("assessmentTaking.written.saving")
            : t("assessmentTaking.written.submitAnswerSheet")}
        </button>
      </div>
    </div>
  );
}
