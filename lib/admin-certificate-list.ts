import type { AdminCertificateRow } from "@/lib/admin-certificate-types";
export type CertificateListFilters = { status: "ALL" | "VALID" | "REVOKED"; q: string; courseId: string; from: string; to: string; pageSize: number; cursor: string };
export type CertificateListPayload = { certificates: AdminCertificateRow[]; nextCursor: string | null; total: number; counts: { ALL: number; VALID: number; REVOKED: number } };
export function decodeCertificateCursor(cursor: string): { issueDate: string; id: string } {
  try {
    const value = JSON.parse(atob(cursor));
    if (typeof value.id !== "string" || !value.id || value.id.length > 100 || typeof value.issueDate !== "string" || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value.issueDate) || !Number.isFinite(Date.parse(value.issueDate))) throw new Error();
    return value;
  } catch { throw new Error("Invalid certificate page cursor."); }
}
export function parseCertificateFilters(params: URLSearchParams): CertificateListFilters {
  const status = params.get("status") || "ALL", q = (params.get("q") || "").trim(), courseId = params.get("courseId") || "";
  const from = params.get("from") || "", to = params.get("to") || "", cursor = params.get("cursor") || "";
  const pageSize = Number(params.get("pageSize") || 25);
  if (!["ALL", "VALID", "REVOKED"].includes(status) || ![25, 50, 100].includes(pageSize)) throw new Error("Invalid certificate filters.");
  if (q.length > 100 || courseId.length > 100 || cursor.length > 300) throw new Error("Filter value is too long.");
  for (const date of [from, to]) if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error("Invalid date.");
  if (from && to && from > to) throw new Error("From date must be on or before To date.");
  if (cursor) decodeCertificateCursor(cursor);
  return { status: status as CertificateListFilters["status"], q, courseId, from, to, cursor, pageSize };
}
