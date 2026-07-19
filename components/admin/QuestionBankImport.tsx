"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchCourse } from "@/lib/admin-course-client";
import type {
  AdminCourseSummary,
  AdminModuleDetail,
} from "@/lib/admin-course-types";
import type {
  AdminBatch,
  AdminExamType,
  AdminInstitution,
  QuestionBankStatusValue,
  QuestionImportDraftConfirmPayload,
  QuestionImportDraftItem,
  QuestionImportJobDetail,
} from "@/lib/question-bank-types";
import {
  confirmImportDraft,
  createQuestionPaper,
  fetchImportJob,
  rejectImportDraft,
  updateImportDraft,
  uploadQuestionBankPdf,
} from "@/lib/question-bank-client";

interface Props {
  courses: AdminCourseSummary[];
  batches: AdminBatch[];
  examTypes: AdminExamType[];
  institutions: AdminInstitution[];
  onClose: () => void;
  onChanged: () => void;
}
const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
const emptyMeta: QuestionImportDraftConfirmPayload = {
  courseId: null,
  moduleId: null,
  batchId: null,
  examTypeId: null,
  institutionId: null,
  examYear: null,
  status: "PUBLISHED",
  tags: [],
};

export default function QuestionBankImport({
  courses,
  batches,
  examTypes,
  institutions,
  onClose,
  onChanged,
}: Props) {
  const t = useTranslations("adminQuestionBankImportPage");
  const [job, setJob] = useState<QuestionImportJobDetail | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paperTitle, setPaperTitle] = useState("");
  const [paperId, setPaperId] = useState<string | null>(null);
  const [meta, setMeta] = useState(emptyMeta);
  const [edits, setEdits] = useState<Record<string, QuestionImportDraftItem>>(
    {},
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [modules, setModules] = useState<AdminModuleDetail[]>([]);
  const [metadataApplied, setMetadataApplied] = useState(false);

  useEffect(() => {
    if (!meta.courseId) {
      setModules([]);
      return;
    }
    void fetchCourse(meta.courseId)
      .then((course) => setModules(course.modules))
      .catch(() => setModules([]));
  }, [meta.courseId]);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const poll = async () => {
      try {
        const data = await fetchImportJob(jobId);
        if (!active) return;
        setJob(data);
        setEdits((current) => ({
          ...Object.fromEntries(
            data.drafts.map((draft) => [draft.id, current[draft.id] ?? draft]),
          ),
        }));
        if (data.status === "PROCESSING") window.setTimeout(poll, 2500);
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load import job.",
          );
      }
    };
    void poll();
    return () => {
      active = false;
    };
  }, [jobId]);

  const drafts = useMemo(
    () =>
      job?.drafts
        .slice()
        .sort((a, b) => (a.confidenceScore ?? 0) - (b.confidenceScore ?? 0)) ??
      [],
    [job],
  );
  const counts = useMemo(
    () => ({
      confirmed: drafts.filter((d) => d.status === "CONFIRMED").length,
      rejected: drafts.filter((d) => d.status === "REJECTED").length,
      pending: drafts.filter(
        (d) => d.status !== "CONFIRMED" && d.status !== "REJECTED",
      ).length,
    }),
    [drafts],
  );

  async function upload(file: File) {
    if (!paperTitle.trim()) {
      setError("Enter a paper title before uploading.");
      return;
    }
    try {
      setUploading(true);
      setError("");
      const paper = await createQuestionPaper({
        title: paperTitle.trim(),
        courseId: meta.courseId,
        moduleId: meta.moduleId,
        batchId: meta.batchId,
        examTypeId: meta.examTypeId,
        institutionId: meta.institutionId,
        examYear: meta.examYear,
      });
      setPaperId(paper.id);
      const result = await uploadQuestionBankPdf(file);
      setJobId(result.jobId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }
  function patchDraft(id: string, values: Partial<QuestionImportDraftItem>) {
    setEdits((current) => ({
      ...current,
      [id]: { ...current[id], ...values },
    }));
  }
  async function saveAndConfirm(draft: QuestionImportDraftItem) {
    const edited = edits[draft.id] ?? draft;
    try {
      setBusyId(draft.id);
      setErrors((current) => ({ ...current, [draft.id]: "" }));
      await updateImportDraft(jobId!, draft.id, {
        type: edited.type,
        question: edited.question,
        options: edited.options,
        correctAnswer: edited.correctAnswer,
        rubric: edited.rubric,
        difficulty: edited.difficulty,
        marks: edited.marks,
      });
      await confirmImportDraft(jobId!, draft.id, { ...meta, paperId });
      setJob(await fetchImportJob(jobId!));
      onChanged();
    } catch (caught) {
      setErrors((current) => ({
        ...current,
        [draft.id]:
          caught instanceof Error
            ? caught.message
            : "Could not confirm question.",
      }));
    } finally {
      setBusyId(null);
    }
  }
  async function reject(draft: QuestionImportDraftItem) {
    try {
      setBusyId(draft.id);
      await rejectImportDraft(jobId!, draft.id);
      setJob(await fetchImportJob(jobId!));
    } catch (caught) {
      setErrors((current) => ({
        ...current,
        [draft.id]:
          caught instanceof Error
            ? caught.message
            : "Could not reject question.",
      }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
      <div className="mx-auto my-6 max-w-[90vw] rounded-xl bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        {!jobId && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
              <p className="mb-2 font-semibold">Expected PDF format</p>
              <p className="mb-2 text-muted-foreground">
                Number each question, put MCQ options as <code>A.</code>–
                <code>D.</code> (one or two per line), and mark the score in
                brackets. Example:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs leading-relaxed">{`1. Who is the writer of the story 'Subha'? [5 marks]
A. Sarat Chandra Chattopadhyay      B. Rabindranath Tagore
C. Bibhutibhushan Bandyopadhyay     D. Manik Bandyopadhyay

2. What is emphasized in 'Boi Pora'? [5 marks]
A. Sports      B. Reading Books
C. Business    D. Traveling`}</pre>
              <p className="mt-2 text-xs text-muted-foreground">
                Works with text-based PDFs (exported/typed papers). Scanned
                image-only PDFs are not supported by this local importer — use
                Upload &amp; OCR on a question paper page instead.
              </p>
            </div>
            <input
              className={inputClass}
              placeholder="Paper title, e.g. Mid Term MCQ"
              value={paperTitle}
              onChange={(e) => setPaperTitle(e.target.value)}
            />
            <label
              className={`flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center ${uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              <Upload className="mb-3" />
              <span>{uploading ? "Uploading…" : t("choosePdf")}</span>
              <input
                className="hidden"
                type="file"
                accept="application/pdf,.pdf"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (!paperTitle.trim()) {
                    setError("Enter a paper title before uploading.");
                    return;
                  }
                  void upload(file);
                }}
              />
            </label>
          </div>
        )}
        {job?.status === "PROCESSING" && (
          <div className="flex min-h-48 flex-col items-center justify-center">
            <LoaderCircle className="mb-3 animate-spin" />
            <p>{t("processing")}</p>
            {job.totalPages && (
              <p className="text-sm text-muted-foreground">
                {job.totalPages} pages detected
              </p>
            )}
          </div>
        )}
        {job?.status === "FAILED" && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            {job.errorMessage || "Extraction failed."}
          </div>
        )}
        {job && job.status !== "PROCESSING" && job.status !== "FAILED" && (
          <>
            <div className="mb-5 rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">
                  Metadata applied when confirming
                </h3>
                {paperId && (
                  <a
                    href={`/admin/question-bank/papers/${paperId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    View paper →
                  </a>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <select
                  className={inputClass}
                  value={meta.courseId ?? ""}
                  onChange={(e) =>
                    setMeta({
                      ...meta,
                      courseId: e.target.value || null,
                      moduleId: null,
                    })
                  }
                >
                  <option value="">No course</option>
                  {courses.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClass}
                  value={meta.moduleId ?? ""}
                  onChange={(e) =>
                    setMeta({ ...meta, moduleId: e.target.value || null })
                  }
                >
                  <option value="">No module</option>
                  {modules.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClass}
                  value={meta.batchId ?? ""}
                  onChange={(e) =>
                    setMeta({ ...meta, batchId: e.target.value || null })
                  }
                >
                  <option value="">No batch</option>
                  {batches.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClass}
                  value={meta.examTypeId ?? ""}
                  onChange={(e) =>
                    setMeta({ ...meta, examTypeId: e.target.value || null })
                  }
                >
                  <option value="">No exam type</option>
                  {examTypes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClass}
                  value={meta.institutionId ?? ""}
                  onChange={(e) =>
                    setMeta({ ...meta, institutionId: e.target.value || null })
                  }
                >
                  <option value="">No institution</option>
                  {institutions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <input
                  className={inputClass}
                  type="number"
                  placeholder="Exam year"
                  value={meta.examYear ?? ""}
                  onChange={(e) =>
                    setMeta({
                      ...meta,
                      examYear: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
                <select
                  className={inputClass}
                  value={meta.status}
                  onChange={(e) =>
                    setMeta({
                      ...meta,
                      status: e.target.value as QuestionBankStatusValue,
                    })
                  }
                >
                  <option value="DRAFT">Draft</option>
                  <option value="REVIEW">Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PUBLISHED">Published</option>
                </select>
                <input
                  className={inputClass}
                  placeholder="Tags, comma separated"
                  value={meta.tags.join(", ")}
                  onChange={(e) =>
                    setMeta({
                      ...meta,
                      tags: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <button
                  className="rounded-lg border px-4 py-2 text-sm"
                  onClick={() => setMetadataApplied(true)}
                >
                  {metadataApplied
                    ? "Applied to pending questions"
                    : "Apply to all"}
                </button>
              </div>
            </div>
            <div className="mb-3 flex justify-between text-sm">
              <span>
                {drafts.length} extracted questions · lowest confidence first
              </span>
              <span>
                {counts.confirmed} confirmed · {counts.rejected} rejected ·{" "}
                {counts.pending} pending
              </span>
            </div>
            <div className="space-y-4">
              {drafts.map((draft) => {
                const edit = edits[draft.id] ?? draft;
                const confidence = Math.round(
                  (draft.confidenceScore ?? 0) * 100,
                );
                const done =
                  draft.status === "CONFIRMED" || draft.status === "REJECTED";
                return (
                  <div key={draft.id} className="rounded-xl border p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${confidence < 75 ? "bg-red-100 text-red-700" : confidence < 90 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}
                      >
                        {confidence}% confidence
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Page {draft.pageNumber ?? "?"}
                      </span>
                      <span className="ml-auto text-xs font-medium">
                        {draft.status}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <select
                        disabled={done}
                        className={inputClass}
                        value={edit.type}
                        onChange={(e) =>
                          patchDraft(draft.id, {
                            type: e.target
                              .value as QuestionImportDraftItem["type"],
                          })
                        }
                      >
                        <option value="MCQ">MCQ</option>
                        <option value="WRITTEN">Written</option>
                        <option value="PRACTICAL">Practical</option>
                      </select>
                      <select
                        disabled={done}
                        className={inputClass}
                        value={edit.difficulty}
                        onChange={(e) =>
                          patchDraft(draft.id, {
                            difficulty: e.target
                              .value as QuestionImportDraftItem["difficulty"],
                          })
                        }
                      >
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>
                      <input
                        disabled={done}
                        className={inputClass}
                        type="number"
                        placeholder="Marks"
                        value={edit.marks ?? ""}
                        onChange={(e) =>
                          patchDraft(draft.id, {
                            marks: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                      />
                    </div>
                    <textarea
                      disabled={done}
                      className={`${inputClass} mt-3 min-h-24`}
                      value={edit.question}
                      onChange={(e) =>
                        patchDraft(draft.id, { question: e.target.value })
                      }
                    />
                    {edit.type === "MCQ" && (
                      <textarea
                        disabled={done}
                        className={`${inputClass} mt-3`}
                        rows={3}
                        value={edit.options.join("\n")}
                        onChange={(e) =>
                          patchDraft(draft.id, {
                            options: e.target.value.split("\n"),
                          })
                        }
                        placeholder="One option per line"
                      />
                    )}
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input
                        disabled={done}
                        className={inputClass}
                        placeholder="Correct answer"
                        value={edit.correctAnswer ?? ""}
                        onChange={(e) =>
                          patchDraft(draft.id, {
                            correctAnswer: e.target.value || null,
                          })
                        }
                      />
                      <input
                        disabled={done}
                        className={inputClass}
                        placeholder="Rubric"
                        value={edit.rubric ?? ""}
                        onChange={(e) =>
                          patchDraft(draft.id, {
                            rubric: e.target.value || null,
                          })
                        }
                      />
                    </div>
                    {errors[draft.id] && (
                      <p className="mt-2 text-sm text-destructive">
                        {errors[draft.id]}
                      </p>
                    )}
                    {!done && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          disabled={busyId === draft.id}
                          className="rounded-lg border px-3 py-2"
                          onClick={() => void reject(draft)}
                        >
                          {t("reject")}
                        </button>
                        <button
                          disabled={busyId === draft.id}
                          className="rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                          onClick={() => void saveAndConfirm(draft)}
                        >
                          {busyId === draft.id ? "Saving…" : t("confirm")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {!drafts.length && (
                <p className="rounded-lg border p-6 text-center text-muted-foreground">
                  No questions were detected in this PDF.
                </p>
              )}
            </div>
          </>
        )}
        {(error || (!job && jobId)) && (
          <p className="mt-4 text-sm text-destructive">
            {error || "Loading import job…"}
          </p>
        )}
      </div>
    </div>
  );
}
