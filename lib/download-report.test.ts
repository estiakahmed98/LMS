import { afterEach, expect, it, vi } from "vitest";
import { downloadReport } from "./download-report";

afterEach(() => vi.unstubAllGlobals());

it("reports permission denial without navigating or starting a download", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ error: "You do not have permission to export reports." }),
    { status: 403, headers: { "Content-Type": "application/json" } },
  )));
  await expect(downloadReport("/api/instructor/reports/export", "report.csv"))
    .rejects.toThrow("You do not have permission to export reports.");
});

it("provides a readable error for a non-JSON server failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unavailable", { status: 502 })));
  await expect(downloadReport("/api/admin/reports/export", "report.csv"))
    .rejects.toThrow("Failed to export report. Please try again.");
});
