import type { LearnerAssessmentSubmissionPayload } from "@/lib/learner-assessment-types";

const SUBMISSION_PAYLOAD_PREFIX = "assessment-payload:";

export function encodeAssessmentSubmissionPayload(
  payload: LearnerAssessmentSubmissionPayload,
) {
  return `${SUBMISSION_PAYLOAD_PREFIX}${encodeURIComponent(JSON.stringify(payload))}`;
}

export function decodeAssessmentSubmissionPayload(answerSheetUrls: string[]) {
  const encoded = answerSheetUrls[0];
  if (!encoded?.startsWith(SUBMISSION_PAYLOAD_PREFIX)) return null;

  try {
    return JSON.parse(
      decodeURIComponent(encoded.slice(SUBMISSION_PAYLOAD_PREFIX.length)),
    ) as LearnerAssessmentSubmissionPayload;
  } catch {
    return null;
  }
}
