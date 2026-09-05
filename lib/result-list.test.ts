import { describe, expect, it } from "vitest";
import { parseResultFilters, RESULT_STATUSES } from "./result-list";

describe("result filters", () => {
  it("supports result-specific statuses and preserves shared filters", () => {
    for (const status of RESULT_STATUSES) {
      expect(parseResultFilters(new URLSearchParams(`status=${status}&type=WRITTEN&courseId=course&batchId=batch&pageSize=24`))).toMatchObject({ status, type: "WRITTEN", courseId: "course", batchId: "batch", pageSize: 24 });
    }
  });
  it("rejects assessment-only statuses and invalid pagination or dates", () => {
    for (const query of ["status=UPCOMING", "status=CLOSED", "pageSize=100000", "cursor=bad", "from=2026-02-30", "from=2026-09-05&to=2026-09-01", "scope=OTHER"]) {
      expect(() => parseResultFilters(new URLSearchParams(query))).toThrow();
    }
  });
});
