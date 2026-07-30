-- Remove the known demo certificate created by the legacy mock-data seed.
-- The predicates intentionally identify that exact sample only.
DELETE FROM "certificates"
WHERE "id" = 'cert_1'
  AND "userId" = 'user_1'
  AND "courseId" = 'course_2'
  AND "certificateNumber" IN ('PSTC-2026-001', 'BOED-2026-001');

ALTER TABLE "certificate_templates"
RENAME COLUMN "institutionName" TO "issuerName";

ALTER TABLE "certificate_templates"
ADD COLUMN "issuerCode" TEXT NOT NULL DEFAULT 'PSTC';

UPDATE "certificate_templates"
SET "issuerName" = 'Professional Skills Training Center',
    "issuerCode" = 'PSTC'
WHERE "id" = 'default'
  AND "issuerName" = 'BOED';

ALTER TABLE "certificates"
ADD COLUMN "issuerName" TEXT NOT NULL DEFAULT 'Professional Skills Training Center',
ADD COLUMN "issuerCode" TEXT NOT NULL DEFAULT 'PSTC',
ADD COLUMN "borderColor" TEXT NOT NULL DEFAULT '#DC2626',
ADD COLUMN "fontFamily" TEXT NOT NULL DEFAULT 'SERIF_FORMAL',
ADD COLUMN "directorSignatureUrl" TEXT,
ADD COLUMN "officialSealUrl" TEXT,
ADD COLUMN "supersedesId" TEXT;

UPDATE "certificates" AS certificate
SET "issuerName" = template."issuerName",
    "issuerCode" = template."issuerCode",
    "borderColor" = template."borderColor",
    "fontFamily" = template."fontFamily",
    "directorSignatureUrl" = template."directorSignatureUrl",
    "officialSealUrl" = template."officialSealUrl"
FROM "certificate_templates" AS template
WHERE template."id" = 'default';

ALTER TABLE "certificates"
ALTER COLUMN "issuerName" DROP DEFAULT,
ALTER COLUMN "issuerCode" DROP DEFAULT,
ALTER COLUMN "borderColor" DROP DEFAULT,
ALTER COLUMN "fontFamily" DROP DEFAULT;

DROP INDEX IF EXISTS "certificates_userId_courseId_key";

CREATE UNIQUE INDEX "certificates_supersedesId_key"
ON "certificates"("supersedesId");

CREATE INDEX "certificates_userId_courseId_idx"
ON "certificates"("userId", "courseId");

ALTER TABLE "certificates"
ADD CONSTRAINT "certificates_supersedesId_fkey"
FOREIGN KEY ("supersedesId") REFERENCES "certificates"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "certificate_sequences" (
  "id" TEXT NOT NULL,
  "issuerCode" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "current" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "certificate_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "certificate_sequences_issuerCode_year_key"
ON "certificate_sequences"("issuerCode", "year");
