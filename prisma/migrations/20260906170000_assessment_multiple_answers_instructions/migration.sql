ALTER TABLE "assessments"
ADD COLUMN IF NOT EXISTS "instructions" TEXT NOT NULL DEFAULT 'Answer all questions. Write your answers in the space provided.';

ALTER TABLE "questions"
ADD COLUMN IF NOT EXISTS "correctAnswers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "questions"
SET "correctAnswers" = ARRAY["correctAnswer"]
WHERE "correctAnswer" IS NOT NULL
  AND btrim("correctAnswer") <> ''
  AND cardinality("correctAnswers") = 0;
