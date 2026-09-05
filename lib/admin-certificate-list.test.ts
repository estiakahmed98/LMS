import { describe, expect, it } from "vitest";
import { decodeCertificateCursor, parseCertificateFilters } from "./admin-certificate-list";
describe("certificate history filters", () => {
  it("validates page limits, statuses, dates and search length", () => {
    expect(parseCertificateFilters(new URLSearchParams()).pageSize).toBe(25);
    for (const value of ["pageSize=100000", "pageSize=-1", "status=OTHER", "from=2026-02-30", "from=2026-09-05&to=2026-09-01", `q=${'a'.repeat(101)}`, "cursor=bad"]) expect(() => parseCertificateFilters(new URLSearchParams(value))).toThrow();
    expect(parseCertificateFilters(new URLSearchParams("status=REVOKED&pageSize=100&from=2024-02-29&to=2024-02-29"))).toMatchObject({ status: "REVOKED", pageSize: 100 });
  });
  it("round trips stable timestamp/id cursors and rejects malformed shapes", () => {
    const value = { id: "certificate-1", issueDate: "2026-09-05T01:02:03.456Z" };
    expect(decodeCertificateCursor(btoa(JSON.stringify(value)))).toEqual(value);
    for (const value of [{}, { id: 1, issueDate: "bad" }, { id: "a", issueDate: "2026-09-05" }]) expect(() => decodeCertificateCursor(btoa(JSON.stringify(value)))).toThrow();
  });
});
