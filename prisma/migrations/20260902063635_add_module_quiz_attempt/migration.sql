-- CreateTable
CREATE TABLE "module_quiz_attempts" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "obtainedMarks" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "module_quiz_attempts_quizId_idx" ON "module_quiz_attempts"("quizId");

-- CreateIndex
CREATE INDEX "module_quiz_attempts_moduleId_userId_idx" ON "module_quiz_attempts"("moduleId", "userId");

-- CreateIndex
CREATE INDEX "module_quiz_attempts_userId_idx" ON "module_quiz_attempts"("userId");

-- AddForeignKey
ALTER TABLE "module_quiz_attempts" ADD CONSTRAINT "module_quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "module_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_quiz_attempts" ADD CONSTRAINT "module_quiz_attempts_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_quiz_attempts" ADD CONSTRAINT "module_quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

