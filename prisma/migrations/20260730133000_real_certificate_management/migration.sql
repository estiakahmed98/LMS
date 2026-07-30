ALTER TABLE "certificates"
ADD COLUMN "revokedAt" TIMESTAMP(3),
ADD COLUMN "revocationReason" TEXT,
ADD COLUMN "reissuedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "certificates_revokedAt_idx" ON "certificates"("revokedAt");

CREATE TABLE "certificate_templates" (
  "id" TEXT NOT NULL,
  "institutionName" TEXT NOT NULL DEFAULT 'BOED',
  "borderColor" TEXT NOT NULL DEFAULT '#DC2626',
  "fontFamily" TEXT NOT NULL DEFAULT 'SERIF_FORMAL',
  "directorSignatureUrl" TEXT,
  "officialSealUrl" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);
