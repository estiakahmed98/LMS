CREATE TYPE "LiveRecordingState" AS ENUM (
  'IDLE', 'STARTING', 'ACTIVE', 'ENDING', 'COMPLETE', 'FAILED'
);

CREATE TYPE "LiveSharePolicy" AS ENUM ('HOST_ONLY', 'ALL_PARTICIPANTS');

-- Convert the legacy nullable free-text recording status without losing data.
ALTER TABLE "live_class_sessions"
  ADD COLUMN "recordingStatus_new" "LiveRecordingState" NOT NULL DEFAULT 'IDLE';

UPDATE "live_class_sessions"
SET "recordingStatus_new" = CASE
  WHEN "recordingStatus" IN ('STARTING', 'ACTIVE', 'ENDING', 'COMPLETE', 'FAILED')
    THEN "recordingStatus"::"LiveRecordingState"
  ELSE 'IDLE'::"LiveRecordingState"
END;

ALTER TABLE "live_class_sessions" DROP COLUMN "recordingStatus";
ALTER TABLE "live_class_sessions" RENAME COLUMN "recordingStatus_new" TO "recordingStatus";

ALTER TABLE "live_class_sessions"
  ADD COLUMN "recordingAttemptId" TEXT,
  ADD COLUMN "recordingChunkCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recordingBytesTotal" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "recordingLastSeq" INTEGER,
  ADD COLUMN "screenSharePolicy" "LiveSharePolicy" NOT NULL DEFAULT 'HOST_ONLY',
  ADD COLUMN "screenShareAllowedIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "live_chat_messages" ADD COLUMN "clientMessageId" TEXT;

CREATE TABLE "live_recording_chunk_logs" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "recordingAttemptId" TEXT NOT NULL,
  "seq" INTEGER NOT NULL,
  "byteLength" INTEGER NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_recording_chunk_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "live_class_sessions_recordingAttemptId_idx"
  ON "live_class_sessions"("recordingAttemptId");
CREATE UNIQUE INDEX "live_chat_messages_sessionId_userId_clientMessageId_key"
  ON "live_chat_messages"("sessionId", "userId", "clientMessageId");
DROP INDEX IF EXISTS "live_chat_messages_sessionId_sentAt_idx";
CREATE INDEX "live_chat_messages_sessionId_sentAt_id_idx"
  ON "live_chat_messages"("sessionId", "sentAt", "id");
CREATE UNIQUE INDEX "live_recording_chunk_logs_recordingAttemptId_seq_key"
  ON "live_recording_chunk_logs"("recordingAttemptId", "seq");
CREATE INDEX "live_recording_chunk_logs_sessionId_recordingAttemptId_idx"
  ON "live_recording_chunk_logs"("sessionId", "recordingAttemptId");

ALTER TABLE "live_recording_chunk_logs"
  ADD CONSTRAINT "live_recording_chunk_logs_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "live_class_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
