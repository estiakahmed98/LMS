-- AlterTable
ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT,
ADD COLUMN IF NOT EXISTS "youtubeVideoId" TEXT;
