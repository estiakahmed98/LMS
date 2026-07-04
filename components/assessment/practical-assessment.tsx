"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FileText, Camera, Check, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Assessment } from "@/lib/mock-data";
import { submitOfflineAssessment } from "@/lib/mock-data";

interface EvidenceItem {
  id: string;
  filename: string;
  thumbnailUrl: string;
  state: "queued" | "optimizing" | "done";
  progress: number;
  originalSize: string;
  optimizedSize?: string;
}

function formatKB(bytes: number) {
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${Math.round(kb)}KB`;
}

export default function PracticalAssessment({
  assessment,
  userId,
}: {
  assessment: Assessment;
  userId: string;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [reportFile, setReportFile] = useState<{
    name: string;
    size: string;
  } | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const reportInputRef = useRef<HTMLInputElement>(null);

  function handleReportSelect(file: File | undefined) {
    if (!file) return;
    setReportFile({ name: file.name, size: formatKB(file.size) });
  }

  function handleEvidenceSelect(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    const id = `${Date.now()}-${Math.random()}`;
    reader.onload = () => {
      const item: EvidenceItem = {
        id,
        filename: file.name,
        thumbnailUrl: reader.result as string,
        state: "queued",
        progress: 0,
        originalSize: formatKB(file.size),
      };
      setEvidence((prev) => [...prev, item]);

      setTimeout(() => {
        setEvidence((prev) =>
          prev.map((e) => (e.id === id ? { ...e, state: "optimizing" } : e)),
        );
        const interval = setInterval(() => {
          setEvidence((prev) =>
            prev.map((e) => {
              if (e.id !== id || e.state !== "optimizing") return e;
              const nextProgress = Math.min(100, e.progress + 20);
              return { ...e, progress: nextProgress };
            }),
          );
        }, 150);

        setTimeout(() => {
          clearInterval(interval);
          setEvidence((prev) =>
            prev.map((e) =>
              e.id === id
                ? {
                    ...e,
                    state: "done",
                    progress: 100,
                    optimizedSize: formatKB(Math.round(file.size * 0.2)),
                  }
                : e,
            ),
          );
        }, 900);
      }, 400);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    submitOfflineAssessment(
      assessment.id,
      userId,
      evidence.map((e) => e.thumbnailUrl),
    );
    setSubmitted(true);
  }

  const canSubmit =
    reportFile !== null && evidence.every((e) => e.state === "done");

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-6">
          <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto" />
          <h1 className="text-3xl font-bold text-card-foreground">
            {t("assessmentTaking.practical.submittedTitle")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("assessmentTaking.practical.submittedMessage")}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold"
          >
            {t("assessmentTaking.practical.returnToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-1">{assessment.title}</h1>
      <p className="text-muted-foreground mb-8">
        {t("assessmentTaking.marksSummary", {
          marks: assessment.totalMarks,
          passingMarks: assessment.passingMarks,
        })}
      </p>

      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted transition-colors">
            <span className="flex items-center justify-center w-12 h-12 rounded-lg border-2 border-destructive text-destructive font-bold text-xs">
              PDF
            </span>
            <p className="font-semibold text-card-foreground">
              {reportFile
                ? reportFile.name
                : t("assessmentTaking.practical.uploadLabReport")}
            </p>
            <p className="text-xs text-muted-foreground">
              {reportFile
                ? reportFile.size
                : t("assessmentTaking.practical.uploadHint")}
            </p>
            <input
              ref={reportInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleReportSelect(e.target.files?.[0])}
              className="hidden"
            />
          </label>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted transition-colors">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-black text-white">
              <Camera className="w-5 h-5" />
            </span>
            <p className="font-semibold text-card-foreground">
              {t("assessmentTaking.practical.captureEvidencePhoto")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("assessmentTaking.practical.capturePhotoHint")}
            </p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleEvidenceSelect(e.target.files?.[0])}
              className="hidden"
            />
          </label>
        </div>

        {evidence.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t("assessmentTaking.practical.uploadedEvidence")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {evidence.map((item) => (
                <div key={item.id} className="space-y-1.5">
                  <div className="relative aspect-square rounded-lg overflow-hidden border border-border">
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.filename}
                      fill
                      className="object-cover"
                    />
                    {item.state === "done" && (
                      <span className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-green-500 text-white">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-card-foreground truncate">
                    {item.filename}
                  </p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.state === "done" ? "bg-green-500" : "bg-amber-500"
                      }`}
                      style={{
                        width: `${item.state === "queued" ? 0 : item.progress}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {item.state === "done" &&
                      t("assessmentTaking.practical.optimizedSummary", {
                        from: item.originalSize,
                        to: item.optimizedSize ?? "",
                      })}
                    {item.state === "optimizing" &&
                      t("assessmentTaking.practical.optimizingProgress", {
                        progress: item.progress,
                      })}
                    {item.state === "queued" &&
                      t("assessmentTaking.practical.queued")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4 inline mr-2 -mt-0.5" />
          {t("assessmentTaking.practical.submitPracticalWork")}
        </button>
      </div>
    </div>
  );
}
