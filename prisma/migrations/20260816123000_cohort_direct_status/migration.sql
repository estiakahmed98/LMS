ALTER TABLE "enrollments" ADD COLUMN "directStatus" "EnrollmentStatus";

UPDATE "enrollments"
SET "directStatus" = "status"
WHERE "directAssignment" = true;
