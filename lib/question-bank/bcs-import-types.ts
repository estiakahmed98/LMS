export type BcsExcelRow = {
  "Question No.": number | string;
  Subject: string;
  Question: string;
  "Option A": string;
  "Option B": string;
  "Option C": string;
  "Option D": string;
  "Correct Answer": string;
  Explanation: string;
};

export type BcsAnswerLabel = "A" | "B" | "C" | "D";

export type ImportedBcsQuestion = {
  id: string;
  sourceRowNumber: number;
  questionNumber?: number;
  subject: string;
  questionText: string;
  marks: number;
  options: Record<BcsAnswerLabel, string>;
  correctAnswer: BcsAnswerLabel | null;
  explanation: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  selected: boolean;
};

export type ImportRowStatus = "valid" | "warning" | "invalid" | "duplicate";

export type BcsColumnMap = {
  questionNumber?: string;
  subject?: string;
  question?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  explanation?: string;
};

export type BcsExcelParseResult = {
  sheetName: string;
  fileName: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
  duplicateCount: number;
  questions: ImportedBcsQuestion[];
  globalErrors: string[];
};

export type BcsImportApiQuestion = {
  questionNumber?: number;
  subject?: string;
  questionText: string;
  marks: number;
  options: Record<BcsAnswerLabel, string>;
  correctAnswer: BcsAnswerLabel;
  explanation?: string;
};

export type BcsImportApiResult = {
  imported: number;
  failed: number;
  skippedDuplicates: number;
  items: import("@/lib/question-bank-types").QuestionBankItemSummary[];
  errors: string[];
};
