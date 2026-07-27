"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { importBcsQuestions } from "@/lib/question-bank-client";
import type { QuestionBankItemSummary } from "@/lib/question-bank-types";
import { parseBcsExcelFile } from "@/lib/question-bank/bcs-excel-parser";
import type {
  BcsAnswerLabel,
  BcsExcelParseResult,
  BcsImportApiQuestion,
  ImportedBcsQuestion,
} from "@/lib/question-bank/bcs-import-types";
import {
  chunkArray,
  getBcsQuestionStatus,
  revalidateBcsQuestions,
} from "@/lib/question-bank/bcs-import-utils";

const IMPORT_BATCH_SIZE = 100;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const allowedExtensions = [".xlsx"];
const answerLabels: BcsAnswerLabel[] = ["A", "B", "C", "D"];
type FilterValue = "all" | "valid" | "invalid" | "warnings";

function fileSizeLabel(size: number): string {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowedExcelFile(file: File): boolean {
  const extension = file.name
    .slice(file.name.lastIndexOf("."))
    .toLocaleLowerCase();
  return allowedExtensions.includes(extension);
}

async function downloadTemplateWorkbook() {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  await writeXlsxFile(
    [
      [
        "Question No.",
        "Subject",
        "Question",
        "Option A",
        "Option B",
        "Option C",
        "Option D",
        "Correct Answer",
        "Explanation",
      ],
      [
        1,
        "Bangla",
        "Who wrote 'Bidrohi'?",
        "Jasimuddin",
        "Kazi Nazrul Islam",
        "Rabindranath Tagore",
        "Michael Madhusudan Dutt",
        "B",
        "Kazi Nazrul Islam wrote the poem 'Bidrohi'.",
      ],
    ],
    {
      sheet: "BCS 50 MCQs",
    },
    {
      fileName: "BCS_Question_Import_Template.xlsx",
    },
  );
}

function summarize(questions: ImportedBcsQuestion[]) {
  return {
    totalRows: questions.length,
    validCount: questions.filter((question) => question.isValid).length,
    invalidCount: questions.filter((question) => !question.isValid).length,
    warningCount: questions.filter((question) => question.warnings.length > 0)
      .length,
    duplicateCount: questions.filter(
      (question) => getBcsQuestionStatus(question) === "duplicate",
    ).length,
    selectedCount: questions.filter(
      (question) => question.selected && question.isValid,
    ).length,
  };
}

function statusClass(question: ImportedBcsQuestion): string {
  const status = getBcsQuestionStatus(question);
  if (status === "valid") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (status === "warning") return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
  if (status === "duplicate") return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  return "bg-destructive/10 text-destructive";
}

function toApiQuestion(question: ImportedBcsQuestion): BcsImportApiQuestion {
  return {
    questionNumber: question.questionNumber,
    subject: question.subject,
    questionText: question.questionText,
    marks: question.marks,
    options: question.options,
    correctAnswer: question.correctAnswer ?? "A",
    explanation: question.explanation,
  };
}

export default function BcsExcelImportDialog({
  paperId,
  disabled,
  existingQuestions,
  onBeforeOpen,
  onImported,
}: {
  paperId: string;
  disabled?: boolean;
  existingQuestions: QuestionBankItemSummary[];
  onBeforeOpen?: () => Promise<boolean>;
  onImported: (items: QuestionBankItemSummary[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<BcsExcelParseResult | null>(
    null,
  );
  const [questions, setQuestions] = useState<ImportedBcsQuestion[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const existingQuestionTexts = useMemo(
    () => existingQuestions.map((question) => question.question),
    [existingQuestions],
  );
  const summary = useMemo(() => summarize(questions), [questions]);
  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((question) => {
      const status = getBcsQuestionStatus(question);
      if (filter === "valid" && status !== "valid") return false;
      if (filter === "invalid" && status !== "invalid") return false;
      if (filter === "warnings" && question.warnings.length === 0) return false;
      if (!term) return true;
      return [question.questionText, question.subject, question.explanation]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [filter, questions, search]);

  function resetImport() {
    setFile(null);
    setParseResult(null);
    setQuestions([]);
    setParsing(false);
    setImporting(false);
    setProgressText("");
    setFilter("all");
    setSearch("");
    setEditingId(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function readFile(nextFile: File) {
    if (!isAllowedExcelFile(nextFile)) {
      toast.error("The selected file must be an .xlsx workbook.");
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error("The Excel file exceeds the maximum allowed size.");
      return;
    }
    setFile(nextFile);
    setParsing(true);
    try {
      const result = await parseBcsExcelFile(nextFile);
      setParseResult(result);
      if (result.globalErrors.length > 0) {
        toast.error(result.globalErrors[0]);
        setQuestions([]);
        return;
      }
      const validated = revalidateBcsQuestions(
        result.questions,
        existingQuestionTexts,
      );
      setQuestions(validated);
      toast.success(`${validated.length} row(s) parsed from ${result.sheetName}.`);
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const dropped = event.dataTransfer.files.item(0);
    if (dropped) void readFile(dropped);
  }

  function updateQuestion(id: string, patch: Partial<ImportedBcsQuestion>) {
    setQuestions((current) =>
      revalidateBcsQuestions(
        current.map((question) =>
          question.id === id ? { ...question, ...patch } : question,
        ),
        existingQuestionTexts,
      ),
    );
  }

  function removeQuestion(id: string) {
    setQuestions((current) =>
      revalidateBcsQuestions(
        current.filter((question) => question.id !== id),
        existingQuestionTexts,
      ),
    );
  }

  function downloadTemplate() {
    void (async () => {
      await downloadTemplateWorkbook();
    })();
  }

  async function handleImport() {
    const selected = questions.filter(
      (question) => question.selected && question.isValid,
    );
    if (selected.length === 0) {
      toast.error("Select at least one valid question to import.");
      return;
    }
    if (
      !window.confirm(
        `You are about to import ${selected.length} BCS questions. Continue?`,
      )
    ) {
      return;
    }
    setImporting(true);
    const chunks = chunkArray(selected.map(toApiQuestion), IMPORT_BATCH_SIZE);
    let imported = 0;
    let failed = 0;
    let skipped = 0;
    const importedItems: QuestionBankItemSummary[] = [];
    try {
      for (let index = 0; index < chunks.length; index += 1) {
        setProgressText(
          `Importing batch ${index + 1} of ${chunks.length}. Imported ${imported} of ${selected.length} questions.`,
        );
        const result = await importBcsQuestions(paperId, chunks[index]);
        imported += result.imported;
        failed += result.failed;
        skipped += result.skippedDuplicates;
        importedItems.push(...result.items);
      }
      onImported(importedItems);
      if (failed > 0 || skipped > 0) {
        toast.success(
          `${imported} questions imported successfully. ${failed} failed. ${skipped} duplicate(s) skipped.`,
        );
      } else {
        toast.success(`${imported} BCS questions were imported successfully.`);
      }
      resetImport();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during import.",
      );
    } finally {
      setImporting(false);
      setProgressText("");
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          if (onBeforeOpen) {
            const canOpen = await onBeforeOpen();
            if (!canOpen) return;
          }
          setOpen(true);
        }}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Import BCS Questions
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
          <div className="flex max-h-[92vh] w-full max-w-7xl flex-col rounded-lg border border-border bg-card shadow-xl">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Import BCS Questions</h2>
                <p className="text-xs text-muted-foreground">
                  Supports .xlsx files using the BCS 50 MCQs format.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border p-2 hover:bg-muted"
                aria-label="Close import dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="space-y-4 overflow-y-auto p-5">
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="rounded-lg border border-dashed border-border bg-background p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="min-w-[220px] flex-1">
                    <p className="text-sm font-semibold">
                      Drop an Excel file here, or browse from your device.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Required headers: Question No., Subject, Question, Option
                      A-D, Correct Answer, Explanation. Max 10 MB.
                    </p>
                    {file && (
                      <p className="mt-1 text-xs font-semibold">
                        {file.name} ({fileSizeLabel(file.size)})
                      </p>
                    )}
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(event) => {
                      const selected = event.target.files?.item(0);
                      if (selected) void readFile(selected);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={parsing || importing}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Browse file
                  </button>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    <Download className="h-4 w-4" />
                    Download Sample Format
                  </button>
                  <button
                    type="button"
                    onClick={resetImport}
                    disabled={parsing || importing}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset import
                  </button>
                </div>
              </div>

              {(parsing || importing) && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {parsing ? "Reading Excel file..." : progressText}
                  </span>
                </div>
              )}

              {parseResult?.globalErrors.map((error) => (
                <p
                  key={error}
                  className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              ))}

              {questions.length > 0 && (
                <>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                    {[
                      ["Total Rows", summary.totalRows],
                      ["Valid Questions", summary.validCount],
                      ["Invalid Rows", summary.invalidCount],
                      ["Warnings", summary.warningCount],
                      ["Duplicates", summary.duplicateCount],
                      ["Selected for Import", summary.selectedCount],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-border bg-background p-3"
                      >
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-xl font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by question or subject"
                      className="min-w-[240px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <select
                      value={filter}
                      onChange={(event) =>
                        setFilter(event.target.value as FilterValue)
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="all">All rows</option>
                      <option value="valid">Valid only</option>
                      <option value="invalid">Invalid only</option>
                      <option value="warnings">Warnings</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((current) =>
                          current.map((question) => ({
                            ...question,
                            selected: question.isValid,
                          })),
                        )
                      }
                      className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      Select all valid
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((current) =>
                          current.map((question) => ({
                            ...question,
                            selected: false,
                          })),
                        )
                      }
                      className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      Clear selection
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[1200px] w-full text-left text-sm">
                      <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                        <tr>
                          {[
                            "Select",
                            "Row",
                            "Question No.",
                            "Subject",
                            "Question",
                            "Option A",
                            "Option B",
                            "Option C",
                            "Option D",
                            "Correct",
                            "Explanation",
                            "Status",
                            "Actions",
                          ].map((heading) => (
                            <th key={heading} className="px-3 py-2">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredQuestions.map((question) => {
                          const editing = editingId === question.id;
                          return (
                            <tr key={question.id} className="align-top">
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={question.selected}
                                  disabled={!question.isValid}
                                  onChange={(event) =>
                                    updateQuestion(question.id, {
                                      selected: event.target.checked,
                                    })
                                  }
                                  aria-label={`Select row ${question.sourceRowNumber}`}
                                />
                              </td>
                              <td className="px-3 py-2">{question.sourceRowNumber}</td>
                              <td className="px-3 py-2">
                                {editing ? (
                                  <input
                                    type="number"
                                    min={1}
                                    value={question.questionNumber ?? ""}
                                    onChange={(event) =>
                                      updateQuestion(question.id, {
                                        questionNumber: event.target.value
                                          ? Number(event.target.value)
                                          : undefined,
                                      })
                                    }
                                    className="w-20 rounded border border-border bg-background px-2 py-1"
                                  />
                                ) : (
                                  question.questionNumber
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {editing ? (
                                  <input
                                    value={question.subject}
                                    onChange={(event) =>
                                      updateQuestion(question.id, {
                                        subject: event.target.value,
                                      })
                                    }
                                    className="w-36 rounded border border-border bg-background px-2 py-1"
                                  />
                                ) : (
                                  question.subject || "-"
                                )}
                              </td>
                              <td className="max-w-[260px] px-3 py-2">
                                {editing ? (
                                  <textarea
                                    value={question.questionText}
                                    onChange={(event) =>
                                      updateQuestion(question.id, {
                                        questionText: event.target.value,
                                      })
                                    }
                                    rows={3}
                                    className="w-64 rounded border border-border bg-background px-2 py-1"
                                  />
                                ) : (
                                  <span title={question.questionText} className="line-clamp-3">
                                    {question.questionText}
                                  </span>
                                )}
                              </td>
                              {answerLabels.map((label) => (
                                <td key={label} className="max-w-[180px] px-3 py-2">
                                  {editing ? (
                                    <input
                                      value={question.options[label]}
                                      onChange={(event) =>
                                        updateQuestion(question.id, {
                                          options: {
                                            ...question.options,
                                            [label]: event.target.value,
                                          },
                                        })
                                      }
                                      className="w-40 rounded border border-border bg-background px-2 py-1"
                                    />
                                  ) : (
                                    <span title={question.options[label]} className="line-clamp-2">
                                      {question.options[label]}
                                    </span>
                                  )}
                                </td>
                              ))}
                              <td className="px-3 py-2">
                                {editing ? (
                                  <select
                                    value={question.correctAnswer ?? ""}
                                    onChange={(event) =>
                                      updateQuestion(question.id, {
                                        correctAnswer:
                                          event.target.value as BcsAnswerLabel,
                                      })
                                    }
                                    className="rounded border border-border bg-background px-2 py-1"
                                  >
                                    <option value="">Select</option>
                                    {answerLabels.map((label) => (
                                      <option key={label} value={label}>
                                        {label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  question.correctAnswer ?? "-"
                                )}
                              </td>
                              <td className="max-w-[260px] px-3 py-2">
                                {editing ? (
                                  <textarea
                                    value={question.explanation}
                                    onChange={(event) =>
                                      updateQuestion(question.id, {
                                        explanation: event.target.value,
                                      })
                                    }
                                    rows={3}
                                    className="w-64 rounded border border-border bg-background px-2 py-1"
                                  />
                                ) : (
                                  <span title={question.explanation} className="line-clamp-3">
                                    {question.explanation || "-"}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusClass(question)}`}
                                >
                                  {getBcsQuestionStatus(question)}
                                </span>
                                {[...question.errors, ...question.warnings].length > 0 && (
                                  <ul className="mt-1 max-w-[220px] space-y-1 text-xs text-muted-foreground">
                                    {[...question.errors, ...question.warnings].map(
                                      (message) => (
                                        <li key={message}>{message}</li>
                                      ),
                                    )}
                                  </ul>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingId(editing ? null : question.id)
                                    }
                                    className="rounded border border-border p-1.5 hover:bg-muted"
                                    aria-label={editing ? "Save row" : "Edit row"}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeQuestion(question.id)}
                                    className="rounded border border-border p-1.5 text-destructive hover:bg-muted"
                                    aria-label="Remove row"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={importing || summary.selectedCount === 0}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {importing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Import Selected Questions
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
