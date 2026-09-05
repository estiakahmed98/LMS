import { describe, expect, it } from "vitest";
import { decodeAssessmentCursor, parseAssessmentFilters } from "./assessment-list";

describe("assessment list query validation", () => {
  it("bounds page sizes and validates types, statuses, and assignment scopes", () => {
    expect(parseAssessmentFilters(new URLSearchParams()).pageSize).toBe(12);
    for (const query of ["pageSize=100000", "pageSize=-1", "pageSize=NaN", "type=OTHER", "status=OTHER", "scope=OTHER"]) {
      expect(() => parseAssessmentFilters(new URLSearchParams(query))).toThrow();
    }
  });
  it("rejects invalid calendar dates and reversed ranges", () => {
    for (const query of ["from=2026-02-30", "to=invalid", "from=2026-09-05&to=2026-09-04"]) {
      expect(() => parseAssessmentFilters(new URLSearchParams(query))).toThrow();
    }
    expect(parseAssessmentFilters(new URLSearchParams("from=2024-02-29&to=2024-02-29")).to).toBe("2024-02-29");
  });
  it("validates cursor shape before querying the database", () => {
    for (const value of ["garbage", btoa('{}'), btoa('{"id":"a","createdAt":"invalid"}')]) expect(() => decodeAssessmentCursor(value)).toThrow();
    const cursor = { id: "assessment-1", createdAt: "2026-09-05T10:00:00.123Z" };
    expect(decodeAssessmentCursor(btoa(JSON.stringify(cursor)))).toEqual(cursor);
  });
});
