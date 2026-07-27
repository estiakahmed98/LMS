import { describe, expect, it } from "vitest";
import { buildChangeDiff, inferSeverity, redact } from "./audit-diff";

describe("buildChangeDiff", () => {
  it("records only the fields that actually changed", () => {
    expect(
      buildChangeDiff(
        { title: "Old", durationHours: 5, status: "DRAFT" },
        { title: "New", durationHours: 5, status: "PUBLISHED" },
      ),
    ).toEqual({
      title: { from: "Old", to: "New" },
      status: { from: "DRAFT", to: "PUBLISHED" },
    });
  });

  it("returns null when nothing changed, so no-op saves add no noise", () => {
    expect(buildChangeDiff({ a: 1, b: "x" }, { a: 1, b: "x" })).toBeNull();
  });

  it("returns null when either side is missing", () => {
    expect(buildChangeDiff(null, { a: 1 })).toBeNull();
    expect(buildChangeDiff({ a: 1 }, undefined)).toBeNull();
  });

  it("treats equal dates as unchanged", () => {
    const first = new Date("2026-07-27T10:00:00Z");
    const second = new Date("2026-07-27T10:00:00Z");
    expect(buildChangeDiff({ at: first }, { at: second })).toBeNull();
  });

  it("detects a field being added or cleared", () => {
    expect(buildChangeDiff({ note: null }, { note: "added" })).toEqual({
      note: { from: null, to: "added" },
    });
    expect(buildChangeDiff({ note: "gone" }, { note: null })).toEqual({
      note: { from: "gone", to: null },
    });
  });

  it("compares nested objects by value rather than reference", () => {
    expect(
      buildChangeDiff({ meta: { a: 1 } }, { meta: { a: 1 } }),
    ).toBeNull();

    expect(buildChangeDiff({ meta: { a: 1 } }, { meta: { a: 2 } })).toEqual({
      meta: { from: { a: 1 }, to: { a: 2 } },
    });
  });

  it("redacts credentials that appear in a changed field", () => {
    const diff = buildChangeDiff(
      { password: "old-secret" },
      { password: "new-secret" },
    );

    expect(diff).toEqual({
      password: { from: "[redacted]", to: "[redacted]" },
    });
  });

  it("redacts credentials nested inside a changed value", () => {
    const diff = buildChangeDiff(
      { profile: { name: "A", token: "old-token" } },
      { profile: { name: "B", token: "new-token" } },
    );

    expect(diff).toEqual({
      profile: {
        from: { name: "A", token: "[redacted]" },
        to: { name: "B", token: "[redacted]" },
      },
    });
  });
});

describe("redact", () => {
  it("strips secrets regardless of key casing", () => {
    expect(
      redact({ Password: "x", PASSWORDHASH: "y", apiKey: "z" }),
    ).toEqual({
      Password: "[redacted]",
      PASSWORDHASH: "[redacted]",
      apiKey: "[redacted]",
    });
  });

  it("strips personal identifiers held in encrypted columns", () => {
    expect(redact({ nidNumberEnc: "cipher", phoneEnc: "cipher" })).toEqual({
      nidNumberEnc: "[redacted]",
      phoneEnc: "[redacted]",
    });
  });

  it("walks arrays and nested structures", () => {
    expect(
      redact({ users: [{ email: "a@b.c", password: "p" }] }),
    ).toEqual({ users: [{ email: "a@b.c", password: "[redacted]" }] });
  });

  it("leaves ordinary values untouched", () => {
    expect(redact({ title: "Course", count: 3, live: true })).toEqual({
      title: "Course",
      count: 3,
      live: true,
    });
  });
});

describe("inferSeverity", () => {
  it("treats failed logins and permission changes as critical", () => {
    expect(inferSeverity("auth.login.failed")).toBe("CRITICAL");
    expect(inferSeverity("auth.lockout")).toBe("CRITICAL");
    expect(inferSeverity("permissions.updated")).toBe("CRITICAL");
    expect(inferSeverity("role.assigned")).toBe("CRITICAL");
  });

  it("treats deletions and suspensions as warnings", () => {
    expect(inferSeverity("course.deleted")).toBe("WARNING");
    expect(inferSeverity("user.suspended")).toBe("WARNING");
  });

  it("treats routine content edits as notices", () => {
    expect(inferSeverity("module.created")).toBe("NOTICE");
    expect(inferSeverity("module.updated")).toBe("NOTICE");
  });

  it("falls back to info for everything else", () => {
    expect(inferSeverity("auth.login.succeeded")).toBe("INFO");
    expect(inferSeverity("module.completed")).toBe("INFO");
  });
});
