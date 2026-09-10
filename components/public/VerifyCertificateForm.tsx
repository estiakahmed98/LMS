"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Search, XCircle } from "lucide-react";

type CertificateResult = {
  number: string;
  learner: string;
  course: string;
  issuer: string;
  issuedAt: string;
  status: "VALID" | "REVOKED";
  revocationReason: string | null;
  replacementNumber: string | null;
};

export function VerifyCertificateForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [certificate, setCertificate] = useState<CertificateResult | null>(null);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const certificateNumber = String(form.get("certificateNumber") ?? "").trim();
    setLoading(true);
    setError("");
    setSearched(false);
    setCertificate(null);

    try {
      const response = await fetch("/api/public/certificates/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateNumber }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification is temporarily unavailable.");
      setCertificate(data.verified ? data.certificate : null);
      setSearched(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Verification is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <form onSubmit={verify} className="rounded-[2rem] border border-border bg-card p-5 shadow-2xl shadow-primary/10 sm:p-8">
        <label htmlFor="certificate-number" className="block text-sm font-semibold text-foreground">Certificate number</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input id="certificate-number" name="certificateNumber" required maxLength={50} autoCapitalize="characters" autoComplete="off" placeholder="e.g. PSTC-2026-000001" className="h-14 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 font-mono text-base uppercase text-foreground outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/10" />
          <button disabled={loading} className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {loading ? "Checking..." : "Verify now"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Enter the complete certificate ID exactly as it appears on the certificate.</p>
      </form>

      {error && <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><span>{error}</span></div>}

      {searched && !certificate && (
        <div className="mt-6 rounded-[2rem] border border-border bg-card p-8 text-center">
          <XCircle className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-bold text-foreground">Certificate not found</h2>
          <p className="mx-auto mt-2 max-w-lg leading-7 text-muted-foreground">We could not match that number to a BOED certificate. Check the number for typing errors and try again.</p>
        </div>
      )}

      {certificate && (
        <div className={`mt-6 overflow-hidden rounded-[2rem] border bg-card ${certificate.status === "VALID" ? "border-primary/30" : "border-destructive/30"}`}>
          <div className={`flex items-center gap-4 border-b p-6 ${certificate.status === "VALID" ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"}`}>
            <span className={`flex size-12 items-center justify-center rounded-full ${certificate.status === "VALID" ? "bg-primary text-primary-foreground" : "bg-destructive text-white"}`}>
              {certificate.status === "VALID" ? <CheckCircle2 className="size-6" /> : <AlertTriangle className="size-6" />}
            </span>
            <div><p className="text-sm font-medium text-muted-foreground">Verification result</p><h2 className="text-xl font-bold text-foreground">Certificate {certificate.status === "VALID" ? "is valid" : "has been revoked"}</h2></div>
          </div>
          <div className="grid gap-x-8 gap-y-6 p-6 sm:grid-cols-2 sm:p-8">
            {[["Certificate ID", certificate.number], ["Learner", certificate.learner], ["Course", certificate.course], ["Issued by", certificate.issuer], ["Issue date", new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(certificate.issuedAt))]].map(([label, value]) => (
              <div key={label}><dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</dt><dd className="mt-1.5 font-semibold text-foreground">{value}</dd></div>
            ))}
          </div>
          {certificate.status === "REVOKED" && <div className="mx-6 mb-6 rounded-xl bg-destructive/5 p-4 text-sm text-destructive sm:mx-8 sm:mb-8"><strong>Reason:</strong> {certificate.revocationReason || "No reason provided."}{certificate.replacementNumber && <span className="mt-1 block">Replacement certificate: <strong>{certificate.replacementNumber}</strong></span>}</div>}
        </div>
      )}
    </div>
  );
}
