import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enrollments: vi.fn(), classes: vi.fn(), cohort: vi.fn(), create: vi.fn(),
  conflicts: vi.fn(), lock: vi.fn(), audit: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  enrollment: { findMany: mocks.enrollments },
  liveClass: { findMany: mocks.classes },
  batchCourse: { findFirst: mocks.cohort },
  $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
    $executeRaw: mocks.lock,
    liveClassSession: { findMany: mocks.conflicts },
    liveClass: { create: mocks.create },
  }),
} }));
vi.mock("@/lib/audit", () => ({ auditLogEntry: mocks.audit, getActorId: async () => "admin" }));
vi.mock("@/lib/rbac", () => ({ withPermission: (_module: unknown, _action: unknown, handler: unknown) => handler }));
import { POST } from "@/app/api/admin/classes/route";

const payload = {
  title: "Notification Class With Estiak 1", courseId: "course", instructorId: "nabila",
  batchId: null, batchCourseId: null, batchName: "",
  status: "SCHEDULED", meetingType: "VIDEO_CONFERENCE", recurrence: "NONE",
  durationMinutes: 60, meetingLink: "https://meet.example.com/class",
  scheduledStart: "2026-09-08T11:45:00+06:00",
};
const post = (overrides = {}) => POST(new Request("http://localhost/api/admin/classes", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, ...overrides }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.enrollments.mockResolvedValue([{ courseId: "course" }]);
  mocks.classes.mockResolvedValue([]);
  mocks.conflicts.mockResolvedValue([]);
  mocks.create.mockImplementation(async ({ data }) => ({
    ...data, id: "new-class", createdAt: new Date(), updatedAt: new Date(),
    course: { title: "Notification Class" }, instructor: { id: "nabila", name: "Nabila", email: "nabila@example.com" },
    sessions: data.sessions.createMany.data.map((session: object) => ({
      ...session, id: "session", status: "UPCOMING", attendances: [], chatMessages: [],
    })),
  }));
});

it.each(["", undefined, "All enrolled learners"])("creates a course-wide class with batchName %s", async (batchName) => {
  const response = await post({ batchName });
  expect(response.status).toBe(201);
  const result = await response.json();
  expect(result.class).toMatchObject({ instructor: { id: "nabila" }, batchId: null, batchCourseId: null, batchName: "All enrolled learners" });
  expect(result.class.sessions[0]).toMatchObject({ scheduledStart: "2026-09-08T05:45:00.000Z", scheduledEnd: "2026-09-08T06:45:00.000Z" });
  expect(mocks.audit).toHaveBeenCalledOnce();
});

it("rejects course-wide creation for an unassigned instructor", async () => {
  mocks.enrollments.mockResolvedValue([]);
  const response = await post();
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain("direct course teaching assignment");
  expect(mocks.create).not.toHaveBeenCalled();
});

it("rejects a batch without a cohort mapping", async () => {
  const response = await post({ batchId: "batch" });
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain("valid cohort course");
  expect(mocks.create).not.toHaveBeenCalled();
});

it("still validates a selected cohort's teaching assignment", async () => {
  mocks.cohort.mockResolvedValue(null);
  const response = await post({ batchId: "batch", batchCourseId: "mapping" });
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain("not mapped to teach");
  expect(mocks.create).not.toHaveBeenCalled();
});

it("creates a class for a valid assigned cohort", async () => {
  mocks.cohort.mockResolvedValue({ id: "mapping", batchId: "batch", batch: { id: "batch", name: "Batch A" } });
  const response = await post({ batchId: "batch", batchCourseId: "mapping" });
  expect(response.status).toBe(201);
  expect((await response.json()).class).toMatchObject({ batchId: "batch", batchCourseId: "mapping", batchName: "Batch A" });
});

it.each([
  ["COMPLETED", "COMPLETED", 201],
  ["COMPLETED", "UPCOMING", 201],
  ["ACTIVE", "COMPLETED", 201],
  ["SCHEDULED", "COMPLETED", 201],
  ["CANCELLED", "UPCOMING", 201],
  ["SCHEDULED", "CANCELLED", 201],
  ["SCHEDULED", "MISSED", 201],
  ["SCHEDULED", "UPCOMING", 409],
  ["ACTIVE", "LIVE", 409],
])("existing %s class / %s session returns %i for the same time", async (classStatus, sessionStatus, expectedStatus) => {
  // Emulate Prisma's status predicates against an overlapping instructor session.
  const matches = (filter: { in?: string[]; not?: string }, value: string) =>
    (!filter.in || filter.in.includes(value)) && filter.not !== value;
  mocks.conflicts.mockImplementation(async ({ where }) =>
    matches(where.status, sessionStatus) && matches(where.liveClass.status, classStatus)
      ? [{ liveClass: { title: "Previous class", instructorId: "nabila", batchId: null } }]
      : [],
  );
  const response = await post();
  expect(response.status).toBe(expectedStatus);
  if (expectedStatus === 201) {
    expect(mocks.create).toHaveBeenCalledOnce();
  } else {
    expect(mocks.create).not.toHaveBeenCalled();
    expect((await response.json()).fieldErrors.instructorId).toContain("already has a class");
  }
});
