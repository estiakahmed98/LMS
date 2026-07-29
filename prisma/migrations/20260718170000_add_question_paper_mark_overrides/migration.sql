-- AlterTable
ALTER TABLE "question_papers"
ADD COLUMN IF NOT EXISTS "fullMarksOverride" INTEGER,
ADD COLUMN IF NOT EXISTS "questionsToAnswer" INTEGER;
