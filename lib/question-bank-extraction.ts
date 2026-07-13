import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { DifficultyValue, QuestionTypeValue } from "@/lib/admin-assessment-types";
import { createImportDraft, markImportJobStatus } from "@/lib/question-bank-server";

interface ExtractedQuestion {
  pageNumber: number;
  type: QuestionTypeValue;
  question: string;
  options: string[];
  correctAnswer: string | null;
  rubric: string | null;
  difficulty: DifficultyValue;
  marks: number | null;
  confidenceScore: number;
}

interface TextLine {
  y: number;
  items: Array<{ x: number; text: string }>;
}

const questionStartPattern = /^(\d+)\s*[.)।]\s*(.+)$/u;
const optionMarkerPattern = /(?:^|\s)([A-Fa-f]|ক|খ|গ|ঘ|ঙ|চ)\s*[.)।]\s*/gu;
const marksPattern = /\[?\s*(\d+)\s*(?:marks?|নম্বর)\s*\]?/iu;

function pageLines(items: ReadonlyArray<unknown>): string[] {
  const lines: TextLine[] = [];
  for (const raw of items) {
    const item = raw as Partial<TextItem>;
    if (typeof item.str !== "string" || !item.str.trim() || !Array.isArray(item.transform)) continue;
    const x = Number(item.transform[4]);
    const y = Number(item.transform[5]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    let line = lines.find((candidate) => Math.abs(candidate.y - y) < 2);
    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }
    line.items.push({ x, text: item.str });
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => line.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseQuestionBlock(pageNumber: number, lines: string[]): ExtractedQuestion | null {
  const first = questionStartPattern.exec(lines[0]);
  if (!first) return null;
  const content = [first[2], ...lines.slice(1)].join(" ").replace(/\s+/g, " ").trim();
  const marksMatch = marksPattern.exec(content);
  const withoutMarks = content.replace(marksPattern, " ").replace(/\s+/g, " ").trim();
  const markers = [...withoutMarks.matchAll(optionMarkerPattern)];
  const firstMarker = markers[0];
  const question = (firstMarker ? withoutMarks.slice(0, firstMarker.index) : withoutMarks).trim();
  if (!question) return null;
  const options = markers.map((marker, index) => {
    const start = (marker.index ?? 0) + marker[0].length;
    const end = markers[index + 1]?.index ?? withoutMarks.length;
    return withoutMarks.slice(start, end).trim();
  }).filter(Boolean);
  const type: QuestionTypeValue = options.length >= 2 ? "MCQ" : "WRITTEN";
  return {
    pageNumber,
    type,
    question,
    options,
    correctAnswer: null,
    rubric: null,
    difficulty: "MEDIUM" as DifficultyValue,
    marks: marksMatch ? Number(marksMatch[1]) : null,
    confidenceScore: type === "MCQ" ? Math.min(0.98, 0.82 + options.length * 0.04) : 0.78,
  };
}

export async function extractQuestionsFromPdf(fileBuffer: Buffer): Promise<{ totalPages: number; questions: ExtractedQuestion[] }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Server-side (Node): pdf.js falls back to a "fake worker" that runs
  // in-process, but it still checks globalThis.pdfjsWorker first before
  // trying to dynamically import a workerSrc path (which Turbopack can't
  // resolve to a real file at runtime). Statically importing the worker
  // module here makes it self-register on globalThis.pdfjsWorker instead.
  // @ts-expect-error -- no type declarations ship for this side-effect-only module
  await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const document = await pdfjs.getDocument({
    data: new Uint8Array(fileBuffer),
  }).promise;
  const questions: ExtractedQuestion[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const lines = pageLines(textContent.items);
    let block: string[] = [];
    for (const line of lines) {
      if (questionStartPattern.test(line)) {
        if (block.length) {
          const question = parseQuestionBlock(pageNumber, block);
          if (question) questions.push(question);
        }
        block = [line];
      } else if (block.length) {
        block.push(line);
      }
    }
    if (block.length) {
      const question = parseQuestionBlock(pageNumber, block);
      if (question) questions.push(question);
    }
  }
  if (!questions.length) {
    throw new Error("No structured questions were found. This local importer requires a text-based PDF with numbered questions; scanned image PDFs need OCR before import.");
  }
  return { totalPages: document.numPages, questions };
}

export async function runExtractionJob(jobId: string, fileBuffer: Buffer): Promise<void> {
  try {
    const result = await extractQuestionsFromPdf(fileBuffer);
    for (const item of result.questions) {
      const { pageNumber, ...payload } = item;
      await createImportDraft(jobId, pageNumber, payload);
    }
    await markImportJobStatus(jobId, "NEEDS_REVIEW", { totalPages: result.totalPages, extractedCount: result.questions.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Question extraction failed.";
    await markImportJobStatus(jobId, "FAILED", { errorMessage: errorMessage.slice(0, 1000) });
  }
}
