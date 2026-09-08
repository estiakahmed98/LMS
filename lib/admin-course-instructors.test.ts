import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { course: mocks } }));
vi.mock("@/lib/audit", () => ({ auditLogEntry: vi.fn(), buildChangeDiff: vi.fn() }));
import { getCourse, listCourses } from "./admin-course-server";
import { initialAdminClassScope } from "./admin-class-draft";
import type { AdminClassCohortOption } from "./admin-class-types";

const nabila = { id: "nabila", name: "Nabila Chowdhury", email: "nabila@example.com" };
const course = {
  id: "course", title: "Notification Class", createdAt: new Date(), updatedAt: new Date(),
  modules: [], category: null,
  enrollments: [
    { id: "assignment", status: "APPROVED", user: { ...nabila, role: "INSTRUCTOR", status: "ACTIVE" } },
    { id: "student", status: "APPROVED", user: { ...nabila, id: "student", role: "STUDENT", status: "ACTIVE" } },
    { id: "pending", status: "PENDING", user: { ...nabila, id: "pending", role: "INSTRUCTOR", status: "ACTIVE" } },
    { id: "inactive", status: "APPROVED", user: { ...nabila, id: "inactive", role: "INSTRUCTOR", status: "SUSPENDED" } },
  ],
  liveClasses: [{ instructor: nabila }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue(course);
  mocks.findMany.mockResolvedValue([course]);
});

it("returns eligible assigned instructors in both course detail and list without duplicates", async () => {
  expect((await getCourse("course"))?.instructors).toEqual([nabila]);
  expect((await listCourses())[0].instructors).toEqual([nabila]);
  expect(mocks.findUnique.mock.calls[0][0].include.enrollments.select.user).toBeDefined();
  expect(mocks.findMany.mock.calls[0][0].include.liveClasses.where.batchId).toBeNull();
});

it("includes direct assignments before any class exists", async () => {
  mocks.findUnique.mockResolvedValue({ ...course, liveClasses: [] });
  expect((await getCourse("course"))?.instructors).toEqual([nabila]);
});

it("initializes a direct instructor without requiring any batch", () => {
  expect(initialAdminClassScope({ id: "course", instructors: [nabila] }, [])).toEqual({
    instructorId: "nabila", batchId: null, batchCourseId: null, batchName: "All enrolled learners",
  });
});

it("keeps batch-only instructors scoped to the matching course", () => {
  const cohorts = [{ courseId: "batch-course", batchId: "batch", batchCourseId: "mapping", name: "Batch A", instructors: [nabila] }] as AdminClassCohortOption[];
  expect(initialAdminClassScope({ id: "batch-course", instructors: [] }, cohorts).batchCourseId).toBe("mapping");
  expect(initialAdminClassScope({ id: "unassigned", instructors: [] }, cohorts).instructorId).toBe("");
  expect(initialAdminClassScope({ id: "course", instructors: [nabila] }, cohorts).batchCourseId).toBeNull();
});
