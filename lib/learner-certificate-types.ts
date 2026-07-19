export interface LearnerCertificateSummary {
  id: string;
  courseId: string;
  courseTitle: string;
  certificateNumber: string;
  issueDate: string;
}

export interface LearnerCertificateDetail extends LearnerCertificateSummary {
  studentName: string;
  studentEmail: string;
  scorePercent: number | null;
}
