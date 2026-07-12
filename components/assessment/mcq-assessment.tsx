"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  ScanLine,
  Sparkles,
  Timer,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Assessment, Question } from "@/lib/mock-data";
import { analyzeOmrScan, type OmrQuestionResult } from "@/lib/omr-scanner";
import { analyzePdfOmr } from "@/lib/pdf-omr-scanner";

const QUESTIONS_PER_PAGE = 10;
const FILE_ACCEPT = "image/*,application/pdf,.pdf";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function buildOmrQuestions(questions: Question[]) {
  return questions.map((question) => ({
    id: question.id,
    options: question.options ?? [],
  }));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });
}

export default function McqAssessment({
  assessment,
  questions,
}: {
  assessment: Assessment;
  questions: Question[];
}) {
  const router = useRouter();
  const t = useTranslations();
  const [mode, setMode] = useState<"digital" | "scan">("digital");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_PAGE));
  const pageQuestions = questions.slice(
    page * QUESTIONS_PER_PAGE,
    page * QUESTIONS_PER_PAGE + QUESTIONS_PER_PAGE,
  );
  const omrQuestions = useMemo(() => buildOmrQuestions(questions), [questions]);

  function goToQuestion(index: number) {
    setActiveQuestion(index);
    setPage(Math.floor(index / QUESTIONS_PER_PAGE));
  }

  useEffect(() => {
    if (mode !== "digital") return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;

  async function handleSubmit(payload?: {
    answers?: Record<string, string>;
    attachments?: string[];
  }) {
    try {
      setSubmitting(true);
      const response = await fetch(
        `/api/learner/assessments/${assessment.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            kind: "MCQ",
            answers: payload?.answers ?? answers,
            attachments: payload?.attachments ?? [],
          }),
        },
      );

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to submit assessment.");
      }

      router.push(
        `/assessments/${assessment.id}/result?submissionId=${result.submission.id}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{assessment.title}</h1>
        <div className="shrink-0 rounded-lg bg-muted p-1">
          <div className="flex gap-1">
            <button
              onClick={() => setMode("digital")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "digital"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {t("assessmentTaking.mcq.onScreen")}
            </button>
            <button
              onClick={() => setMode("scan")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "scan"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {t("assessmentTaking.mcq.scanOmr")}
            </button>
          </div>
        </div>
      </div>

      <p className="mb-8 text-muted-foreground">
        {t("assessmentTaking.mcq.questionsMarksSummary", {
          count: questions.length,
          plural: questions.length !== 1 ? "s" : "",
          marks: assessment.totalMarks,
          passingMarks: assessment.passingMarks,
        })}
      </p>

      {mode === "digital" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            {pageQuestions.map((q, pageIndex) => {
              const index = page * QUESTIONS_PER_PAGE + pageIndex;
              const optionList = q.options ?? [];
              return (
                <div
                  key={q.id}
                  onFocus={() => setActiveQuestion(index)}
                  className="space-y-6 rounded-lg border border-border bg-card p-6"
                >
                  <h2 className="text-xl font-bold text-card-foreground">
                    {t("assessmentTaking.mcq.questionWithMarks", {
                      number: index + 1,
                      marks: q.marks,
                    })}
                  </h2>
                  <p className="text-muted-foreground">{q.question}</p>

                  <div className="space-y-3">
                    {optionList.map((opt, idx) => (
                      <label
                        key={idx}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          className="h-4 w-4"
                          checked={answers[q.id] === opt}
                          onChange={() => {
                            setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                            setActiveQuestion(index);
                          }}
                        />
                        <span className="text-card-foreground">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("assessmentTaking.mcq.previous")}
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`h-8 w-8 rounded-md text-sm font-semibold transition-colors ${
                        i === page
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  disabled={page === totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("assessmentTaking.mcq.next")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-5 rounded-lg border border-border bg-card p-5 lg:sticky lg:top-20 lg:self-start">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("assessmentTaking.mcq.timeRemaining")}
              </p>
              <div className="flex items-center gap-2 text-destructive">
                <Timer className="h-6 w-6" />
                <span className="tabular-nums text-3xl font-bold">
                  {formatTime(secondsLeft)}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("assessmentTaking.mcq.progressAnswered", {
                  answered: answeredCount,
                  total: questions.length,
                })}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, index) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isActive = index === activeQuestion;
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={`flex aspect-square items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-destructive text-white"
                          : isAnswered
                            ? "bg-green-500 text-white"
                            : "border border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              disabled={!allAnswered || submitting}
              onClick={() => void handleSubmit()}
              className="w-full rounded-full bg-destructive px-6 py-3 font-semibold text-white transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? t("assessmentTaking.written.saving")
                : t("assessmentTaking.mcq.submitAssessment")}
            </button>
          </div>
        </div>
      ) : (
        <OmrWorkspace
          assessment={assessment}
          questions={questions}
          omrQuestions={omrQuestions}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function OmrWorkspace({
  assessment,
  questions,
  omrQuestions,
  submitting,
  onSubmit,
}: {
  assessment: Assessment;
  questions: Question[];
  omrQuestions: { id: string; options: string[] }[];
  submitting: boolean;
  onSubmit: (payload: {
    answers?: Record<string, string>;
    attachments?: string[];
  }) => Promise<void>;
}) {
  const [scanState, setScanState] = useState<
    "idle" | "processing" | "review" | "submitting"
  >("idle");
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanPreviewImages, setScanPreviewImages] = useState<string[]>([]);
  const [analysisMessage, setAnalysisMessage] = useState<string>(
    "Upload a filled OMR sheet to detect marked bubbles automatically.",
  );
  const [scanConfidence, setScanConfidence] = useState(0);
  const [questionResults, setQuestionResults] = useState<OmrQuestionResult[]>([]);
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, string>>({});
  const [detectedAt, setDetectedAt] = useState<string | null>(null);
  const [tab, setTab] = useState<"scan" | "sheet">("sheet");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<"IMAGE" | "PDF" | null>(null);

  const totalDetected = Object.keys(reviewAnswers).length;
  const unresolvedCount = questionResults.filter((result) => result.ambiguous).length;

  async function handleCaptureFile(file: File) {
    setScanState("processing");
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    setAnalysisMessage(isPdf ? "Analyzing PDF page layout..." : "Reading image...");
    setScanImage(null);
    setScanPreviewImages([]);
    setDetectedAt(null);
    setSelectedFileName(file.name);
    setSelectedFileType(isPdf ? "PDF" : "IMAGE");

    try {
      if (isPdf) {
        const result = await analyzePdfOmr(file, omrQuestions);
        setScanPreviewImages(result.previewImages);
        setScanImage(result.previewImages[0] ?? null);
        setQuestionResults(result.questionResults);
        setReviewAnswers(result.answers);
        setScanConfidence(result.confidence);
        setAnalysisMessage(
          [
            `${Object.keys(result.answers).length}/${questions.length} answers detected`,
            `confidence ${Math.round(result.confidence * 100)}%`,
            result.previewImages.length > 1
              ? `${result.previewImages.length} PDF pages processed`
              : "",
          ]
            .filter(Boolean)
            .join(" - "),
        );
        setDetectedAt(new Date().toLocaleTimeString());
        setScanState("review");
        return;
      }

      const images = [await readFileAsDataUrl(file)];
      const pageCount = images.length;
      const combinedAnswers: Record<string, string> = {};
      const combinedResults = new Map<string, OmrQuestionResult>();
      let confidenceTotal = 0;
      let confidenceCount = 0;

      for (const [index, image] of images.entries()) {
        if (index === 0) {
          setScanImage(image);
        }
        const result = await analyzeOmrScan(image, omrQuestions);
        confidenceTotal += result.confidence;
        confidenceCount += 1;

        for (const item of result.questionResults) {
          const previous = combinedResults.get(item.questionId);
          if (!previous || item.confidence >= previous.confidence) {
            combinedResults.set(item.questionId, item);
            const selected = item.selectedAnswer;
            if (selected) {
              combinedAnswers[item.questionId] = selected;
            } else {
              delete combinedAnswers[item.questionId];
            }
          }
        }
      }

      const mergedResults = questions.map((question) => {
        const detected = combinedResults.get(question.id);
        return (
          detected ?? {
            questionId: question.id,
            selectedIndex: null,
            selectedAnswer: null,
            confidence: 0,
            scores: [],
            ambiguous: true,
          }
        );
      });

      setScanPreviewImages(images);
      setQuestionResults(mergedResults);
      setReviewAnswers(combinedAnswers);
      setScanConfidence(confidenceCount > 0 ? confidenceTotal / confidenceCount : 0);
      setAnalysisMessage(
        [
          `${Object.keys(combinedAnswers).length}/${questions.length} answers detected`,
          confidenceCount > 0
            ? `confidence ${Math.round((confidenceTotal / confidenceCount) * 100)}%`
            : "",
          pageCount > 1 ? `${pageCount} PDF pages processed` : "",
        ]
          .filter(Boolean)
          .join(" - "),
      );
      setDetectedAt(new Date().toLocaleTimeString());
      setScanState("review");
    } catch (error) {
      setScanState("idle");
      setAnalysisMessage(
        error instanceof Error
          ? error.message
          : "Unable to analyze the file. Please upload a clearer image or PDF.",
      );
    }
  }

  async function handleConfirmSubmit() {
    setScanState("submitting");
    try {
      await onSubmit({
        answers: reviewAnswers,
        attachments: scanPreviewImages.length > 0 ? scanPreviewImages : scanImage ? [scanImage] : [],
      });
    } catch (error) {
      setScanState("review");
      setAnalysisMessage(
        error instanceof Error ? error.message : "Submit failed. Please try again.",
      );
    }
  }

  function updateAnswer(questionId: string, answer: string | null) {
    setReviewAnswers((prev) => {
      const next = { ...prev };
      if (answer === null) {
        delete next[questionId];
      } else {
        next[questionId] = answer;
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-full border border-border bg-background p-1">
        <button
          type="button"
          onClick={() => setTab("sheet")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "sheet"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Question Sheet
        </button>
        <button
          type="button"
          onClick={() => setTab("scan")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "scan"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Scan & Submit
        </button>
      </div>

      {tab === "sheet" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ScanLine className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-card-foreground">
                  Question Sheet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upload the filled answer sheet. Detected answers will appear
                  here and you can review them before submitting.
                </p>
              </div>
            </div>

            <QuestionPaperPreview
              questions={questions}
              questionResults={questionResults}
              reviewAnswers={reviewAnswers}
              onCaptureFile={handleCaptureFile}
              selectedFileName={selectedFileName}
              selectedFileType={selectedFileType}
            />
          </div>

          <DetectionSidebar
            analysisMessage={analysisMessage}
            detectedCount={totalDetected}
            totalQuestions={questions.length}
            scanConfidence={scanConfidence}
            unresolvedCount={unresolvedCount}
            detectedAt={detectedAt}
            scanState={scanState}
            scanImage={scanImage}
            scanPreviewImages={scanPreviewImages}
            onSubmit={handleConfirmSubmit}
            submitting={submitting}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ScanLine className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-card-foreground">
                  OMR capture
                </h3>
                <p className="text-sm text-muted-foreground">
                  Use the printed sheet, keep it flat, and fill bubbles clearly.
                </p>
              </div>
            </div>

            <UploadControls onCaptureFile={handleCaptureFile} />

            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              This tab only analyzes the scan. Use the Question Sheet tab to
              review the detected bubbles and submit when ready.
            </div>
          </div>

          <DetectionSidebar
            analysisMessage={analysisMessage}
            detectedCount={totalDetected}
            totalQuestions={questions.length}
            scanConfidence={scanConfidence}
            unresolvedCount={unresolvedCount}
            detectedAt={detectedAt}
            scanState={scanState}
            scanImage={scanImage}
            scanPreviewImages={scanPreviewImages}
          />
        </div>
      )}
    </div>
  );
}

function UploadControls({
  onCaptureFile,
}: {
  onCaptureFile: (file: File) => Promise<void>;
}) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
        <Camera className="h-4 w-4" />
        Scan with Camera
        <input
          type="file"
          accept={FILE_ACCEPT}
          capture="environment"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await onCaptureFile(file);
            e.target.value = "";
          }}
          className="hidden"
        />
      </label>

      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
        <RotateCcw className="h-4 w-4" />
        Upload Scan
        <input
          type="file"
          accept={FILE_ACCEPT}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await onCaptureFile(file);
            e.target.value = "";
          }}
          className="hidden"
        />
      </label>
    </div>
  );
}

function DetectionSidebar({
  analysisMessage,
  detectedCount,
  totalQuestions,
  scanConfidence,
  unresolvedCount,
  detectedAt,
  scanState,
  scanImage,
  scanPreviewImages,
  onSubmit,
  submitting,
}: {
  analysisMessage: string;
  detectedCount: number;
  totalQuestions: number;
  scanConfidence: number;
  unresolvedCount: number;
  detectedAt: string | null;
  scanState: "idle" | "processing" | "review" | "submitting";
  scanImage: string | null;
  scanPreviewImages?: string[];
  onSubmit?: () => void;
  submitting?: boolean;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-card-foreground">
            Detection status
          </h3>
          <p className="text-sm text-muted-foreground">{analysisMessage}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Detected answers</span>
          <span className="font-semibold text-card-foreground">
            {detectedCount}/{totalQuestions}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Scan confidence</span>
          <span className="font-semibold text-card-foreground">
            {formatConfidence(scanConfidence)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Ambiguous questions</span>
          <span className="font-semibold text-card-foreground">
            {unresolvedCount}
          </span>
        </div>
        {detectedAt ? (
          <div className="mt-3 text-xs text-muted-foreground">
            Last analyzed at {detectedAt}
          </div>
        ) : null}
      </div>

      {scanState === "processing" || scanState === "submitting" ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="font-semibold text-card-foreground">
            {scanState === "processing" ? "Analyzing scan..." : "Submitting answers..."}
          </p>
          <p className="text-sm text-muted-foreground">
            {scanState === "processing"
              ? "Reading the bubbles on your answer sheet."
              : "Sending the detected answers to the assessment API."}
          </p>
        </div>
      ) : scanPreviewImages && scanPreviewImages.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Uploaded preview
          </p>
          <div className="grid grid-cols-1 gap-3">
            {scanPreviewImages.slice(0, 3).map((image, index) => (
              <div key={`${image}-${index}`} className="overflow-hidden rounded-xl border border-border">
                <img
                  src={image}
                  alt={`Uploaded preview ${index + 1}`}
                  className="h-auto w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      ) : scanImage ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Uploaded scan
          </p>
          <div className="overflow-hidden rounded-xl border border-border">
            <img
              src={scanImage}
              alt="Uploaded OMR scan"
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      ) : null}

      {onSubmit ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      ) : null}
    </div>
  );
}

function QuestionPaperPreview({
  questions,
  questionResults,
  reviewAnswers,
  onCaptureFile,
  selectedFileName,
  selectedFileType,
}: {
  questions: Question[];
  questionResults: OmrQuestionResult[];
  reviewAnswers: Record<string, string>;
  onCaptureFile: (file: File) => Promise<void>;
  selectedFileName: string | null;
  selectedFileType: "IMAGE" | "PDF" | null;
}) {
  const optionCount = (question: Question) => Math.max((question.options ?? []).length, 2);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              OMR template
            </p>
            <p className="text-sm text-muted-foreground">
              Fill one bubble per question, then scan or photograph the page.
            </p>
          </div>
          <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {questions.length} questions
          </div>
        </div>

        <div className="rounded-2xl border-2 border-border bg-white p-4 text-slate-900 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                Assessment OMR
              </p>
              <p className="text-lg font-bold text-slate-900">Answer Sheet Preview</p>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              Mark only one bubble per row
              <br />
              Keep the sheet flat for best detection
            </div>
          </div>

          <div className="space-y-2">
            {questions.map((question, index) => {
              const optionList = question.options ?? [];
              return (
                <div
                  key={question.id}
                  className="grid items-center gap-3 rounded-lg px-2 py-1"
                  style={{
                    gridTemplateColumns: "3.25rem minmax(0, 1fr)",
                  }}
                >
                  <div className="text-sm font-semibold tabular-nums text-slate-700">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="grid items-center gap-2">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      <span>Question {index + 1}</span>
                      <span>{optionList.length} options</span>
                    </div>
                    <div
                      className="grid items-center gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${optionCount(question)}, minmax(0, 1fr))`,
                      }}
                    >
                      {optionList.map((option, optionIndex) => {
                        const detectedAnswer = reviewAnswers[question.id] ?? null;
                        const selected = detectedAnswer === option;
                        return (
                          <div
                            key={`${question.id}-${optionIndex}`}
                            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 ${
                              selected ? "border-emerald-500 bg-emerald-500/5" : "border-slate-200"
                            }`}
                          >
                            <span className="text-[10px] font-semibold text-slate-500">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                                selected
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-400 text-slate-700"
                              }`}
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-white" : "bg-transparent"}`} />
                            </span>
                            <span className="max-w-full truncate text-[10px] text-slate-600">
                              {option}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
            <Camera className="h-4 w-4" />
            Scan with Camera / PDF
            <input
              type="file"
              accept={FILE_ACCEPT}
              capture="environment"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await onCaptureFile(file);
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
            <RotateCcw className="h-4 w-4" />
            Upload File
            <input
              type="file"
              accept={FILE_ACCEPT}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await onCaptureFile(file);
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>

          {selectedFileName ? (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {selectedFileType ? `${selectedFileType}: ` : ""}
              {selectedFileName}
            </span>
          ) : null}
        </div>

        {questions.map((question, index) => {
          const result = questionResults[index];
          const currentAnswer = reviewAnswers[question.id] ?? null;
          const optionList = question.options ?? [];
          return (
            <div key={question.id} className="mb-3 rounded-xl border border-border p-4 last:mb-0">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">
                    Question {index + 1}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result ? `Confidence ${formatConfidence(result.confidence)}` : "Not analyzed"}
                  </p>
                </div>
                {result?.ambiguous ? (
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
                    Review
                  </span>
                ) : currentAnswer ? (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                    Detected
                  </span>
                ) : null}
              </div>

              <p className="mb-3 text-sm text-muted-foreground">{question.question}</p>

              <div className="flex flex-wrap gap-2">
                {optionList.map((option) => {
                  const active = currentAnswer === option;
                  return (
                    <span
                      key={option}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-card-foreground"
                      }`}
                    >
                      {option}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
