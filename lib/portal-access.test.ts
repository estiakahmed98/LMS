import { describe, expect, it } from "vitest";
import { ROLE_VALUES } from "./admin-role-types";
import {
  canInstructorUseCourse,
  canViewPrivateMessage,
  filterVisibleMessages,
  isActiveAccountStatus,
  isApprovedEnrollment,
  isInstructorRole,
  isLearnerPortalPath,
  isLearnerRole,
  isOwnedBy,
} from "./portal-access";

describe("portal role policy", () => {
  it("exposes every platform role in the configurable matrix", () => {
    expect(ROLE_VALUES).toEqual([
      "SUPER_ADMIN",
      "COURSE_MANAGER",
      "EXAMINER",
      "REPORT_VIEWER",
      "INSTRUCTOR",
      "STUDENT",
    ]);
  });

  it("accepts only the expected fixed portal roles", () => {
    expect(isInstructorRole("INSTRUCTOR")).toBe(true);
    expect(isInstructorRole("STUDENT")).toBe(false);
    expect(isInstructorRole("SUPER_ADMIN")).toBe(false);

    expect(isLearnerRole("STUDENT")).toBe(true);
    expect(isLearnerRole("INSTRUCTOR")).toBe(false);
    expect(isLearnerRole("COURSE_MANAGER")).toBe(false);
  });

  it("blocks suspended and inactive accounts", () => {
    expect(isActiveAccountStatus("ACTIVE")).toBe(true);
    expect(isActiveAccountStatus("SUSPENDED")).toBe(false);
    expect(isActiveAccountStatus("INACTIVE")).toBe(false);
  });
});

describe("portal ownership policy", () => {
  it("allows only assigned instructor courses", () => {
    const assigned = new Set(["course-a", "course-b"]);
    expect(canInstructorUseCourse(assigned, "course-a")).toBe(true);
    expect(canInstructorUseCourse(assigned, "course-c")).toBe(false);
    expect(canInstructorUseCourse([], "course-a")).toBe(false);
  });

  it("denies cross-owner resource access", () => {
    expect(isOwnedBy("instructor-a", "instructor-a")).toBe(true);
    expect(isOwnedBy("instructor-b", "instructor-a")).toBe(false);
    expect(isOwnedBy(null, "instructor-a")).toBe(false);
  });

  it("requires approved learner enrollment", () => {
    expect(isApprovedEnrollment("APPROVED")).toBe(true);
    expect(isApprovedEnrollment("PENDING")).toBe(false);
    expect(isApprovedEnrollment("REJECTED")).toBe(false);
    expect(isApprovedEnrollment(undefined)).toBe(false);
  });
});

describe("live room visibility", () => {
  const messages = [
    { id: "public", isPrivate: false, senderId: "a", toUserId: null },
    { id: "to-b", isPrivate: true, senderId: "a", toUserId: "b" },
    { id: "to-c", isPrivate: true, senderId: "a", toUserId: "c" },
  ];

  it("limits private messages to sender, recipient, or host", () => {
    expect(canViewPrivateMessage(messages[1], "b", false)).toBe(true);
    expect(canViewPrivateMessage(messages[1], "a", false)).toBe(true);
    expect(canViewPrivateMessage(messages[1], "c", false)).toBe(false);
    expect(canViewPrivateMessage(messages[1], "host", true)).toBe(true);
  });

  it("filters another learner's private messages", () => {
    expect(filterVisibleMessages(messages, "b", false).map(({ id }) => id))
      .toEqual(["public", "to-b"]);
  });
});

describe("learner page gate", () => {
  it.each([
    "/dashboard",
    "/courses/course-1",
    "/assessments",
    "/certificates/cert-1",
    "/settings",
    "/live-classes",
    "/question-bank/papers/paper-1",
  ])("recognizes %s as a learner portal path", (pathname) => {
    expect(isLearnerPortalPath(pathname)).toBe(true);
  });

  it("does not gate public and staff paths as learner pages", () => {
    expect(isLearnerPortalPath("/")).toBe(false);
    expect(isLearnerPortalPath("/login")).toBe(false);
    expect(isLearnerPortalPath("/enroll/course-1")).toBe(false);
    expect(isLearnerPortalPath("/admin/dashboard")).toBe(false);
    expect(isLearnerPortalPath("/instructor/dashboard")).toBe(false);
  });
});
