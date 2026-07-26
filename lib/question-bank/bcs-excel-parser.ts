import type {
  BcsAnswerLabel,
  BcsColumnMap,
  BcsExcelParseResult,
  ImportedBcsQuestion,
} from "@/lib/question-bank/bcs-import-types";
import {
  detectBcsColumnMap,
  normalizeCellValue,
  normalizeHeader,
  normalizeQuestionForDuplicate,
  parseCorrectAnswer,
  parseQuestionNumber,
  validateBcsQuestion,
} from "@/lib/question-bank/bcs-import-utils";

const REQUIRED_COLUMNS: { key: keyof BcsColumnMap; label: string }[] = [
  { key: "question", label: "Question" },
  { key: "optionA", label: "Option A" },
  { key: "optionB", label: "Option B" },
  { key: "optionC", label: "Option C" },
  { key: "optionD", label: "Option D" },
  { key: "correctAnswer", label: "Correct Answer" },
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const allowedExtensions = [".xlsx", ".xls"];

function isEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((value) => !normalizeCellValue(value));
}

function cell(row: Record<string, unknown>, key: string | undefined): string {
  return key ? normalizeCellValue(row[key]) : "";
}

function summarize(
  result: Omit<
    BcsExcelParseResult,
    "validCount" | "invalidCount" | "warningCount" | "duplicateCount"
  >,
): BcsExcelParseResult {
  return {
    ...result,
    validCount: result.questions.filter((question) => question.isValid).length,
    invalidCount: result.questions.filter((question) => !question.isValid).length,
    warningCount: result.questions.filter(
      (question) => question.warnings.length > 0,
    ).length,
    duplicateCount: result.questions.filter((question) =>
      question.warnings.some((warning) =>
        warning.toLowerCase().includes("duplicate"),
      ),
    ).length,
  };
}

export async function parseBcsExcelFile(
  file: File,
): Promise<BcsExcelParseResult> {
  const extension = file.name
    .slice(file.name.lastIndexOf("."))
    .toLocaleLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return summarize({
      sheetName: "",
      fileName: file.name,
      totalRows: 0,
      questions: [],
      globalErrors: ["The selected file is not a valid Excel file."],
    });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return summarize({
      sheetName: "",
      fileName: file.name,
      totalRows: 0,
      questions: [],
      globalErrors: ["The Excel file exceeds the maximum allowed size."],
    });
  }

  try {
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: true,
      raw: false,
    });
    if (workbook.SheetNames.length === 0) {
      return summarize({
        sheetName: "",
        fileName: file.name,
        totalRows: 0,
        questions: [],
        globalErrors: ["No worksheet was found in this workbook."],
      });
    }
    const sheetName =
      workbook.SheetNames.find(
        (name) => name.trim().toLowerCase() === "bcs 50 mcqs",
      ) ?? workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return summarize({
        sheetName,
        fileName: file.name,
        totalRows: 0,
        questions: [],
        globalErrors: ["No worksheet was found in this workbook."],
      });
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
      raw: false,
    });
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const columnMap = detectBcsColumnMap(headers);
    const globalErrors = REQUIRED_COLUMNS.flatMap((column) =>
      columnMap[column.key] ? [] : [`Required column "${column.label}" was not found.`],
    );
    if (globalErrors.length > 0) {
      return summarize({
        sheetName,
        fileName: file.name,
        totalRows: rows.length,
        questions: [],
        globalErrors,
      });
    }

    const seen = new Map<string, number>();
    const questions = rows
      .map((row, index) => ({ row, sourceRowNumber: index + 2 }))
      .filter(({ row }) => !isEmptyRow(row))
      .filter(({ row }) => normalizeHeader(cell(row, columnMap.question)) !== "question")
      .map(({ row, sourceRowNumber }, index): ImportedBcsQuestion => {
        const options: Record<BcsAnswerLabel, string> = {
          A: cell(row, columnMap.optionA),
          B: cell(row, columnMap.optionB),
          C: cell(row, columnMap.optionC),
          D: cell(row, columnMap.optionD),
        };
        const question: ImportedBcsQuestion = {
          id: `row-${sourceRowNumber}`,
          sourceRowNumber,
          questionNumber: parseQuestionNumber(
            cell(row, columnMap.questionNumber),
            index + 1,
          ),
          subject: cell(row, columnMap.subject),
          questionText: cell(row, columnMap.question),
          marks: 1,
          options,
          correctAnswer: parseCorrectAnswer(cell(row, columnMap.correctAnswer), options),
          explanation: cell(row, columnMap.explanation),
          isValid: true,
          errors: [],
          warnings: [],
          selected: true,
        };
        const validated = validateBcsQuestion(question);
        const duplicateKey = normalizeQuestionForDuplicate(validated.questionText);
        if (duplicateKey) {
          const count = seen.get(duplicateKey) ?? 0;
          seen.set(duplicateKey, count + 1);
          if (count > 0) {
            return validateBcsQuestion({
              ...validated,
              warnings: [
                ...validated.warnings,
                "Possible duplicate question in this file",
              ],
            });
          }
        }
        return validated;
      });

    return summarize({
      sheetName,
      fileName: file.name,
      totalRows: rows.length,
      questions,
      globalErrors:
        questions.length === 0 ? ["No question rows were found."] : [],
    });
  } catch (error) {
    console.error("BCS Excel parse failed", error);
    return summarize({
      sheetName: "",
      fileName: file.name,
      totalRows: 0,
      questions: [],
      globalErrors: [
        "An unexpected error occurred while reading the Excel file.",
      ],
    });
  }
}
