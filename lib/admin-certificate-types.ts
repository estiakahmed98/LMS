export type CertificateEligibility = "PASS" | "COMPLETED";
export type CertificateFont = "SERIF_FORMAL" | "SANS_MODERN";

export interface AdminCertificateRow {
  id: string;
  certificateNumber: string;
  student: string;
  studentEmail: string;
  course: string;
  courseId: string;
  issueDate: string;
  status: "VALID" | "REVOKED";
  revokedAt: string | null;
  reissuedAt?: string | null;
  revocationReason: string | null;
}

export interface CertificateCourseOption {
  id: string;
  title: string;
}

export interface CertificateTemplateValue {
  issuerName: string;
  issuerCode: string;
  borderColor: string;
  fontFamily: CertificateFont;
  directorSignatureUrl: string | null;
  officialSealUrl: string | null;
}
