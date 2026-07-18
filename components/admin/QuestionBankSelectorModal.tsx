"use client";

import {
  fetchBatches,
  fetchExamTypes,
  fetchInstitutions,
  fetchQuestionBankItems,
} from "@/lib/question-bank-client";
import type {
  AdminExtractedQuestion,
  DifficultyValue,
  QuestionTypeValue,
} from "@/lib/admin-assessment-types";
import type {
  AdminBatch,
  AdminExamType,
  AdminInstitution,
  QuestionBankItemSummary,
} from "@/lib/question-bank-types";
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Dices,
  GripVertical,
  Library,
  LoaderCircle,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 500;

const typeOptions: QuestionTypeValue[] = ["MCQ", "WRITTEN", "PRACTICAL"];
const difficultyOptions: DifficultyValue[] = ["EASY", "MEDIUM", "HARD"];

function difficultyBadgeClass(difficulty: DifficultyValue) {
  switch (difficulty) {
    case "EASY":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
    case "HARD":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400";
  }
}

function toExtractedQuestion(
  item: QuestionBankItemSummary,
): AdminExtractedQuestion {
  return {
    type: item.type,
    question: item.question,
    marks: item.marks ?? 5,
    options: item.options ?? [],
    correctAnswer: item.correctAnswer,
    rubric: item.rubric,
    difficulty: item.difficulty,
    timeLimitMinutes: 2,
  };
}

export default function QuestionBankSelectorModal({
  courseId,
  courseTitle,
  assessmentType,
  disabled,
  onImport,
}: {
  courseId: string;
  courseTitle: string;
  assessmentType: QuestionTypeValue;
  disabled?: boolean;
  onImport: (questions: AdminExtractedQuestion[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const [items, setItems] = useState<QuestionBankItemSummary[]>([]);
  const [examTypes, setExamTypes] = useState<AdminExamType[]>([]);
  const [institutions, setInstitutions] = useState<AdminInstitution[]>([]);
  const [batches, setBatches] = useState<AdminBatch[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<QuestionTypeValue | "">(
    assessmentType,
  );
  const [difficultyFilter, setDifficultyFilter] = useState<
    DifficultyValue | ""
  >("");
  const [examTypeFilter, setExamTypeFilter] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  // Selection + draft
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<QuestionBankItemSummary[]>([]);
  const [randomCount, setRandomCount] = useState("5");

  // Drag state
  const dragItemRef = useRef<{
    source: "bank" | "draft";
    id: string;
  } | null>(null);
  const [dragOverDraft, setDragOverDraft] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const draftIds = useMemo(() => new Set(draft.map((q) => q.id)), [draft]);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await fetchQuestionBankItems({
        courseId,
        search: search.trim() || undefined,
        type: typeFilter || undefined,
        difficulty: difficultyFilter || undefined,
        examTypeId: examTypeFilter || undefined,
        institutionId: institutionFilter || undefined,
        batchId: batchFilter || undefined,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load questions.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    courseId,
    search,
    typeFilter,
    difficultyFilter,
    examTypeFilter,
    institutionFilter,
    batchFilter,
  ]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void loadItems(), 300);
    return () => clearTimeout(timer);
  }, [open, loadItems]);

  useEffect(() => {
    if (!open) return;
    void Promise.allSettled([
      fetchExamTypes().then(setExamTypes),
      fetchInstitutions().then(setInstitutions),
      fetchBatches().then(setBatches),
    ]);
  }, [open]);

  // Year range is filtered client-side (the API only supports an exact year).
  const filteredItems = useMemo(() => {
    const from = Number(yearFrom) || null;
    const to = Number(yearTo) || null;
    if (!from && !to) return items;
    return items.filter((item) => {
      if (item.examYear === null) return false;
      if (from && item.examYear < from) return false;
      if (to && item.examYear > to) return false;
      return true;
    });
  }, [items, yearFrom, yearTo]);

  const availableItems = useMemo(
    () => filteredItems.filter((item) => !draftIds.has(item.id)),
    [filteredItems, draftIds],
  );

  const allVisibleSelected =
    availableItems.length > 0 &&
    availableItems.every((item) => selectedIds.has(item.id));

  function resetState() {
    setSelectedIds(new Set());
    setDraft([]);
    setError("");
    setSearch("");
    setYearFrom("");
    setYearTo("");
    setDifficultyFilter("");
    setExamTypeFilter("");
    setInstitutionFilter("");
    setBatchFilter("");
    setTypeFilter(assessmentType);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableItems.map((item) => item.id)));
    }
  }

  function addToDraft(toAdd: QuestionBankItemSummary[], atIndex?: number) {
    setDraft((prev) => {
      const existing = new Set(prev.map((q) => q.id));
      const fresh = toAdd.filter((q) => !existing.has(q.id));
      if (fresh.length === 0) return prev;
      if (atIndex === undefined || atIndex >= prev.length) {
        return [...prev, ...fresh];
      }
      const next = [...prev];
      next.splice(atIndex, 0, ...fresh);
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      toAdd.forEach((q) => next.delete(q.id));
      return next;
    });
  }

  function addSelected() {
    addToDraft(availableItems.filter((item) => selectedIds.has(item.id)));
  }

  function addRandom() {
    const count = Math.max(1, Number(randomCount) || 0);
    const pool = [...availableItems];
    // Fisher-Yates partial shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    addToDraft(pool.slice(0, count));
  }

  function removeFromDraft(id: string) {
    setDraft((prev) => prev.filter((q) => q.id !== id));
  }

  function moveDraftItem(fromIndex: number, toIndex: number) {
    setDraft((prev) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex > prev.length
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);
      return next;
    });
  }

  function handleDropOnDraft(atIndex?: number) {
    const drag = dragItemRef.current;
    dragItemRef.current = null;
    setDragOverDraft(false);
    setDragOverIndex(null);
    if (!drag) return;

    if (drag.source === "bank") {
      const dragged = availableItems.find((item) => item.id === drag.id);
      if (!dragged) return;
      // If the dragged item is part of the current selection, move the whole selection.
      const group = selectedIds.has(drag.id)
        ? availableItems.filter(
            (item) => selectedIds.has(item.id) || item.id === drag.id,
          )
        : [dragged];
      addToDraft(group, atIndex);
    } else {
      const fromIndex = draft.findIndex((q) => q.id === drag.id);
      if (fromIndex === -1) return;
      moveDraftItem(fromIndex, atIndex ?? draft.length);
    }
  }

  async function handleImport() {
    if (draft.length === 0) return;
    try {
      setImporting(true);
      setError("");
      await onImport(draft.map(toExtractedQuestion));
      setOpen(false);
      resetState();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add questions.",
      );
    } finally {
      setImporting(false);
    }
  }

  const draftTotalMarks = draft.reduce((sum, q) => sum + (q.marks ?? 5), 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg border border-violet-600 bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:border-violet-700 hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        <Library className="h-4 w-4" />
        Select from Question Bank
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                  <Library className="h-5 w-5 text-violet-600" />
                  Select from Question Bank
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Course: <span className="font-semibold">{courseTitle}</span>{" "}
                  — pick questions on the left, build your draft on the right.
                  Drag &amp; drop or use checkboxes.
                </p>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  resetState();
                }}
                className="rounded-lg border border-border p-2 hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="border-b border-border bg-destructive/10 px-5 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Body */}
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
              {/* Left: bank */}
              <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
                {/* Filters */}
                <div className="space-y-2 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search questions..."
                        className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm"
                      />
                    </div>
                    <button
                      onClick={toggleSelectAll}
                      disabled={availableItems.length === 0}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                      Select all
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    <select
                      value={typeFilter}
                      onChange={(event) =>
                        setTypeFilter(
                          event.target.value as QuestionTypeValue | "",
                        )
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">All types</option>
                      {typeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type === "WRITTEN" ? "Written (CQ)" : type}
                        </option>
                      ))}
                    </select>
                    <select
                      value={difficultyFilter}
                      onChange={(event) =>
                        setDifficultyFilter(
                          event.target.value as DifficultyValue | "",
                        )
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">All difficulties</option>
                      {difficultyOptions.map((item) => (
                        <option key={item} value={item}>
                          {item.charAt(0) + item.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <select
                      value={examTypeFilter}
                      onChange={(event) =>
                        setExamTypeFilter(event.target.value)
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">All exam types</option>
                      {examTypes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={institutionFilter}
                      onChange={(event) =>
                        setInstitutionFilter(event.target.value)
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">All institutions</option>
                      {institutions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={batchFilter}
                      onChange={(event) => setBatchFilter(event.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">All batches</option>
                      {batches.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        value={yearFrom}
                        onChange={(event) => setYearFrom(event.target.value)}
                        type="number"
                        placeholder="Year from"
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input
                        value={yearTo}
                        onChange={(event) => setYearTo(event.target.value)}
                        type="number"
                        placeholder="Year to"
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                  {/* Random generate */}
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-violet-400/60 bg-violet-500/5 px-2.5 py-2">
                    <Dices className="h-4 w-4 text-violet-600" />
                    <span className="text-xs font-semibold">
                      Random generate
                    </span>
                    <input
                      value={randomCount}
                      onChange={(event) => setRandomCount(event.target.value)}
                      type="number"
                      min={1}
                      className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">
                      questions from {availableItems.length} filtered
                    </span>
                    <button
                      onClick={addRandom}
                      disabled={availableItems.length === 0}
                      className="ml-auto rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                {/* Bank list */}
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {loading ? (
                    <div className="flex items-center justify-center p-10">
                      <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableItems.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      {filteredItems.length > 0
                        ? "All matching questions are already in the draft."
                        : "No questions found for this course with the current filters."}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {availableItems.map((item) => (
                        <li
                          key={item.id}
                          draggable
                          onDragStart={(event) => {
                            dragItemRef.current = {
                              source: "bank",
                              id: item.id,
                            };
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            dragItemRef.current = null;
                            setDragOverDraft(false);
                            setDragOverIndex(null);
                          }}
                          onClick={() => toggleSelect(item.id)}
                          className={`group flex cursor-grab items-start gap-2.5 rounded-lg border p-3 transition-colors active:cursor-grabbing ${
                            selectedIds.has(item.id)
                              ? "border-violet-500 bg-violet-500/10"
                              : "border-border bg-background hover:border-violet-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            onClick={(event) => event.stopPropagation()}
                            className="mt-1 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium">
                              {item.question}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                                {item.type}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 font-semibold ${difficultyBadgeClass(item.difficulty)}`}
                              >
                                {item.difficulty.charAt(0) +
                                  item.difficulty.slice(1).toLowerCase()}
                              </span>
                              <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">
                                {item.marks ?? 5} marks
                              </span>
                              {item.examYear && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">
                                  {item.examYear}
                                </span>
                              )}
                              {item.examTypeName && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                                  {item.examTypeName}
                                </span>
                              )}
                              {item.institutionName && (
                                <span className="truncate rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                                  {item.institutionName}
                                </span>
                              )}
                            </div>
                          </div>
                          <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Left footer actions */}
                <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} selected · {availableItems.length}{" "}
                    available
                  </span>
                  <button
                    onClick={addSelected}
                    disabled={selectedIds.size === 0}
                    className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Add selected
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Right: draft */}
              <div className="flex min-h-0 flex-col">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Draft ({draft.length} questions · {draftTotalMarks}{" "}
                      marks)
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Drag to reorder, or drop questions here from the left.
                    </p>
                  </div>
                  {draft.length > 0 && (
                    <button
                      onClick={() => setDraft([])}
                      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  )}
                </div>

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOverDraft(true);
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget === event.target) {
                      setDragOverDraft(false);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDropOnDraft(dragOverIndex ?? undefined);
                  }}
                  className={`min-h-0 flex-1 overflow-y-auto p-3 transition-colors ${
                    dragOverDraft ? "bg-violet-500/5" : ""
                  }`}
                >
                  {draft.length === 0 ? (
                    <div
                      className={`flex h-full min-h-40 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground ${
                        dragOverDraft
                          ? "border-violet-500 text-violet-600"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Drop questions here, select from the left, or use
                        random generate
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {draft.map((item, index) => (
                        <li
                          key={item.id}
                          draggable
                          onDragStart={(event) => {
                            dragItemRef.current = {
                              source: "draft",
                              id: item.id,
                            };
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            dragItemRef.current = null;
                            setDragOverDraft(false);
                            setDragOverIndex(null);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const rect =
                              event.currentTarget.getBoundingClientRect();
                            const before =
                              event.clientY < rect.top + rect.height / 2;
                            setDragOverIndex(before ? index : index + 1);
                            setDragOverDraft(true);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const rect =
                              event.currentTarget.getBoundingClientRect();
                            const before =
                              event.clientY < rect.top + rect.height / 2;
                            handleDropOnDraft(before ? index : index + 1);
                          }}
                          className={`flex cursor-grab items-start gap-2.5 rounded-lg border border-border bg-background p-3 active:cursor-grabbing ${
                            dragOverIndex === index && dragOverDraft
                              ? "border-t-2 border-t-violet-500"
                              : ""
                          }`}
                        >
                          <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="mt-0.5 shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium">
                              {item.question}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                                {item.type}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 font-semibold ${difficultyBadgeClass(item.difficulty)}`}
                              >
                                {item.difficulty.charAt(0) +
                                  item.difficulty.slice(1).toLowerCase()}
                              </span>
                              <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">
                                {item.marks ?? 5} marks
                              </span>
                              {item.examYear && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">
                                  {item.examYear}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromDraft(item.id)}
                            className="rounded-lg border border-border p-1.5 text-destructive hover:bg-muted"
                            aria-label="Remove from draft"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Right footer */}
                <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <button
                    onClick={() => {
                      setOpen(false);
                      resetState();
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleImport()}
                    disabled={draft.length === 0 || importing}
                    className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {importing ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Library className="h-4 w-4" />
                    )}
                    Add {draft.length > 0 ? `${draft.length} ` : ""}Question
                    {draft.length === 1 ? "" : "s"} to Assessment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
