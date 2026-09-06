import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lock: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), audit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
      $queryRaw: mocks.lock,
      assessment: { findUnique: mocks.findUnique, delete: mocks.delete },
    }),
  },
}));
vi.mock("@/lib/audit", () => ({ auditLogEntry: mocks.audit }));

import { AssessmentDeletionBlockedError, deleteAssessment } from "./admin-assessment-server";

describe("assessment deletion protection", () => {
  beforeEach(() => vi.resetAllMocks());

  it("blocks deletion after any learner starts an attempt", async () => {
    mocks.findUnique.mockResolvedValue({ title: "Final Exam", _count: { submissions: 1 } });
    await expect(deleteAssessment("assessment-1")).rejects.toBeInstanceOf(AssessmentDeletionBlockedError);
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("deletes and audits an assessment with no attempts", async () => {
    mocks.findUnique.mockResolvedValue({ title: "Final Exam", _count: { submissions: 0 } });
    await deleteAssessment("assessment-1", "admin-1");
    expect(mocks.lock).toHaveBeenCalledOnce();
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: "assessment-1" } });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1", action: "assessment.deleted", changes: { title: "Final Exam", attemptCount: 0 },
    }));
  });
});
