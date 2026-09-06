import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), delete: vi.fn(), lock: vi.fn(), audit: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
    $queryRaw: mocks.lock,
    course: { findUnique: mocks.findUnique, delete: mocks.delete },
  }),
} }));
vi.mock("@/lib/audit", () => ({ auditLogEntry: mocks.audit, buildChangeDiff: vi.fn() }));

import { CourseDeletionBlockedError, deleteCourse } from "./admin-course-server";

describe("course deletion dependency protection", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([
    { enrollments: 1, modules: 0, assessments: 0 },
    { enrollments: 0, modules: 1, assessments: 0 },
    { enrollments: 0, modules: 0, assessments: 1 },
    { enrollments: 2, modules: 3, assessments: 1 },
  ])("protects courses with dependencies: %j", async (_count) => {
    mocks.findUnique.mockResolvedValue({ title: "Course", _count });
    await expect(deleteCourse("course-1")).rejects.toBeInstanceOf(CourseDeletionBlockedError);
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("deletes and audits an empty course", async () => {
    mocks.findUnique.mockResolvedValue({ title: "Empty", _count: { enrollments: 0, modules: 0, assessments: 0 } });
    await deleteCourse("course-1", "admin-1");
    expect(mocks.lock).toHaveBeenCalledOnce();
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: "course-1" } });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "course.deleted", actorId: "admin-1" }));
  });

  it("does not audit a failed deletion", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.delete.mockRejectedValue(new Error("Course not found."));
    await expect(deleteCourse("missing")).rejects.toThrow("Course not found.");
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
