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
import { usePortalPermissions } from "@/components/portal/PortalPermissionsProvider";
import StatusPill, { type QuestionStatus } from "./status-pill";
import CameraViewfinder from "./camera-viewfinder";
import PageThumbnailGrid from "./page-thumbnail-grid";
import WrittenQuestionContent from "./written-question-content";
import IncompleteSubmissionDialog from "./incomplete-submission-dialog";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

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
  const { can } = usePortalPermissions();
  const canSubmit = can("ASSESSMENTS", "view");
  const [mode, setMode] = useState<"digital" | "scan">("digital");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const submittedRef = useRef(false);

  async function submitAssessment(
    body: Record<string, unknown>,
    options: { redirect?: boolean } = {},
  ) {
    const shouldRedirect = options.redirect ?? true;
    if (!canSubmit || submittingRef.current || submittedRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/learner/assessments/${assessment.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to submit assessment.");
      }
      submittedRef.current = true;
      setSubmitting(false);
      setSubmitted(true);
      if (shouldRedirect) {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        router.push(`/assessments/${assessment.id}/result?submissionId=${result.submission.id}`);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

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
        canSubmit={canSubmit}
        onSubmit={async (answers, options) => {
          await submitAssessment({
            kind: "WRITTEN",
            mode: "DIGITAL",
            answers,
          }, options);
        }}
      />
    ) : (
      <WrittenScanMode
        questions={questions}
        submitting={submitting}
        canSubmit={canSubmit}
        onSubmit={async (pages, options) => {
          await submitAssessment({
            kind: "WRITTEN",
            mode: "SCAN",
            attachments: pages,
          }, options);
        }}
      />
    )}
    </div>
  );
}

function WrittenDigitalMode({
  questions,
  submitting,
  canSubmit = true,
  onSubmit,
}: {
  questions: Question[];
  submitting: boolean;
  canSubmit?: boolean;
  onSubmit: (
    answers: Record<string, string>,
    options?: { redirect?: boolean },
  ) => Promise<void>;
}) {
  const t = useTranslations();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState(questions[0]?.id);
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const configuredMinutes = questions.reduce(
      (total, question) => total + (question.timeLimitMinutes ?? 0),
      0,
    );
    return (configuredMinutes > 0 ? configuredMinutes : 45) * 60;
  });
  const [autosaveState, setAutosaveState] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftsRef = useRef(drafts);
  const onSubmitRef = useRef(onSubmit);
  const timerSubmittedRef = useRef(false);

  useEffect(() => {
    draftsRef.current = drafts;
    onSubmitRef.current = onSubmit;
  }, [drafts, onSubmit]);

  useEffect(() => {
    const interval = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsLeft > 0 || timerSubmittedRef.current) return;
    timerSubmittedRef.current = true;
    void onSubmitRef.current(draftsRef.current);
  }, [secondsLeft]);

  useEffect(() => {
    async function submitAndContinue(event: Event) {
      const customEvent = event as CustomEvent<{
        onSubmitted?: () => void;
      }>;
      try {
        await onSubmit(drafts, { redirect: false });
      } finally {
        customEvent.detail?.onSubmitted?.();
      }
    }

    function submitOnHidden() {
      if (document.visibilityState === "hidden") {
        void onSubmit(drafts, { redirect: false }).catch(() => {});
      }
    }

    function submitOnPageHide() {
      void onSubmit(drafts, { redirect: false }).catch(() => {});
    }

    window.addEventListener(
      "learner-assessment-auto-submit-request",
      submitAndContinue,
    );
    document.addEventListener("visibilitychange", submitOnHidden);
    window.addEventListener("pagehide", submitOnPageHide);

    return () => {
      window.removeEventListener(
        "learner-assessment-auto-submit-request",
        submitAndContinue,
      );
      document.removeEventListener("visibilitychange", submitOnHidden);
      window.removeEventListener("pagehide", submitOnPageHide);
    };
  });

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
  const activeQuestion = questions.find((question) => question.id === activeId);
  const wordCount = activeText.trim()
    ? activeText.trim().split(/\s+/).length
    : 0;
  const allAnswered = questions.every(
    (q) => Boolean(drafts[q.id]?.trim()),
  );
  const answeredCount = questions.filter((question) =>
    Boolean(drafts[question.id]?.trim()),
  ).length;
  const unansweredNumbers = questions.flatMap((question, index) =>
    drafts[question.id]?.trim() ? [] : [index + 1],
  );

  function requestSubmit() {
    if (!allAnswered) {
      setShowIncompleteWarning(true);
      return;
    }
    void onSubmit(drafts);
  }

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

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:flex lg:h-[calc(100dvh-6rem)] lg:min-h-0 lg:flex-col">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("assessmentTaking.written.examQuestions")}
          </p>
          <div className="mt-3 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
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
                  <div className="text-muted-foreground">
                    <WrittenQuestionContent
                      prompt={q.question}
                      options={q.options}
                      className="text-card-foreground"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex flex-col rounded-lg border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)] lg:min-h-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {activeId
              ? t("assessmentTaking.written.yourAnswerWithQuestion", {
                  number: questions.findIndex((q) => q.id === activeId) + 1,
                })
              : t("assessmentTaking.written.yourAnswer")}
          </p>
          {activeQuestion && (
            <div className="mb-4 max-h-[30dvh] overflow-y-auto rounded-lg border border-border bg-muted/40 p-4 lg:shrink-0">
              <WrittenQuestionContent
                prompt={activeQuestion.question}
                options={activeQuestion.options}
                className="text-card-foreground"
              />
            </div>
          )}
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
            className="h-[clamp(18rem,50dvh,32rem)] border border-t-0 border-border rounded-b-lg p-4 text-sm text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 lg:h-auto lg:min-h-0 lg:flex-1"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {t("assessmentTaking.written.wordCount", {
              count: wordCount,
            })}
          </p>

          {canSubmit && (
            <button
              disabled={answeredCount === 0 || submitting}
              onClick={requestSubmit}
              className="mt-4 w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? t("assessmentTaking.written.saving")
                : t("assessmentTaking.written.submitWrittenExam")}
            </button>
          )}
        </div>
      </div>

      {showIncompleteWarning ? (
        <IncompleteSubmissionDialog
          unansweredNumbers={unansweredNumbers}
          submitting={submitting}
          onCancel={() => setShowIncompleteWarning(false)}
          onConfirm={() => {
            setShowIncompleteWarning(false);
            void onSubmit(drafts);
          }}
        />
      ) : null}
    </div>
  );
}

function WrittenScanMode({
  questions,
  submitting,
  canSubmit = true,
  onSubmit,
}: {
  questions: Question[];
  submitting: boolean;
  canSubmit?: boolean;
  onSubmit: (
    pages: string[],
    options?: { redirect?: boolean },
  ) => Promise<void>;
}) {
  const t = useTranslations();
  const [pages, setPages] = useState<string[]>([]);

  function addPage(dataUrl: string) {
    setPages((prev) => [...prev, dataUrl]);
  }

  function removePage(index: number) {
    setPages((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    async function submitAndContinue(event: Event) {
      const customEvent = event as CustomEvent<{
        onSubmitted?: () => void;
      }>;
      try {
        await onSubmit(pages, { redirect: false });
      } finally {
        customEvent.detail?.onSubmitted?.();
      }
    }

    function submitOnHidden() {
      if (document.visibilityState === "hidden") {
        void onSubmit(pages, { redirect: false }).catch(() => {});
      }
    }

    function submitOnPageHide() {
      void onSubmit(pages, { redirect: false }).catch(() => {});
    }

    window.addEventListener(
      "learner-assessment-auto-submit-request",
      submitAndContinue,
    );
    document.addEventListener("visibilitychange", submitOnHidden);
    window.addEventListener("pagehide", submitOnPageHide);

    return () => {
      window.removeEventListener(
        "learner-assessment-auto-submit-request",
        submitAndContinue,
      );
      document.removeEventListener("visibilitychange", submitOnHidden);
      window.removeEventListener("pagehide", submitOnPageHide);
    };
  });

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        {t("assessmentTaking.written.scanIntro")}
      </p>

      <section className="mb-6 rounded-lg border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-bold text-card-foreground">
          {t("assessmentTaking.written.examQuestions")}
        </h2>
        <ol className="space-y-5">
          {questions.map((question, index) => (
            <li
              key={question.id}
              className="rounded-lg border border-border bg-muted/30 p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-bold text-card-foreground">
                  {t("assessmentTaking.written.questionShortWithMarks", {
                    number: index + 1,
                    marks: question.marks,
                  })}
                </span>
              </div>
              <WrittenQuestionContent
                prompt={question.question}
                options={question.options}
                className="text-card-foreground"
              />
            </li>
          ))}
        </ol>
      </section>

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
        {canSubmit && (
          <button
            disabled={pages.length === 0 || submitting}
            onClick={() => onSubmit(pages)}
            className="w-full px-6 py-3 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? t("assessmentTaking.written.saving")
              : t("assessmentTaking.written.submitAnswerSheet")}
          </button>
        )}
      </div>
    </div>
  );
}
