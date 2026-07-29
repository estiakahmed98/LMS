ALTER TABLE "question_bank_items"
ADD COLUMN IF NOT EXISTS "subject" TEXT,
ADD COLUMN IF NOT EXISTS "explanation" TEXT;
