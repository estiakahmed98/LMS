"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

export default function PasswordRecoveryForm({ mode, email: initialEmail = "", token = "", callbackUrl = "" }: { mode: "forgot" | "reset"; email?: string; token?: string; callbackUrl?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const query = callbackUrl ? `?${new URLSearchParams({ callbackUrl })}` : "";
  const isReset = mode === "reset";
  const missingToken = isReset && !/^[a-f0-9]{64}$/.test(token);
  const normalizedEmail = email.trim().toLowerCase();
  const validEmail = normalizedEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const [emailCheck, setEmailCheck] = useState<{ email: string; exists: boolean; error?: string } | null>(null);
  const currentCheck = emailCheck?.email === normalizedEmail ? emailCheck : null;
  const canSend = validEmail && currentCheck?.exists === true;

  useEffect(() => {
    if (isReset || !validEmail) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/forgot-password/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to check email. Please try again later.");
        if (!controller.signal.aborted) setEmailCheck({ email: normalizedEmail, exists: data.exists === true });
      } catch (error) {
        if (!controller.signal.aborted) setEmailCheck({ email: normalizedEmail, exists: false, error: error instanceof Error ? error.message : "Unable to check email. Please try again later." });
      }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [isReset, normalizedEmail, validEmail]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || (!isReset && !canSend)) return;
    setError("");
    if (isReset && password !== confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch(isReset ? "/api/reset-password" : "/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isReset ? { token, password, confirmPassword } : { email: email.trim().toLowerCase(), callbackUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setMessage(data.message);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to connect. Please try again.");
    } finally { setBusy(false); }
  }

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <h1 className="text-xl font-bold text-card-foreground">{isReset ? "Reset your password" : "Forgot password?"}</h1>
        <p className="text-sm text-muted-foreground">{isReset ? "Choose a new password with at least 8 characters." : "Enter your account email and we’ll send you a password reset link."}</p>
        {message ? <p role="status" className="rounded-lg bg-primary/10 p-3 text-sm text-card-foreground">{message}</p> : missingToken ? <p role="alert" className="text-sm text-destructive">This password reset link is invalid. Please request a new link.</p> : (
          <form onSubmit={submit} className="space-y-4">
            {isReset ? <>
              <label className="grid gap-1.5 text-sm text-card-foreground">New password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /></label>
              <label className="grid gap-1.5 text-sm text-card-foreground">Confirm password<input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} /></label>
            </> : <label className="grid gap-1.5 text-sm text-card-foreground">Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); if (event.target.value.trim().toLowerCase() !== normalizedEmail) setEmailCheck(null); setError(""); }} aria-describedby="email-check-status" aria-invalid={Boolean(currentCheck && !currentCheck.exists)} className={inputClass} /></label>}
            {!isReset && <div id="email-check-status" aria-live="polite" className="text-sm">
              {validEmail && !currentCheck && <p className="text-muted-foreground">Checking email...</p>}
              {currentCheck?.exists && <p className="text-green-600">Email found. You can send a reset link.</p>}
              {currentCheck && !currentCheck.exists && <p className="text-destructive">{currentCheck.error || "Mail not found"}</p>}
            </div>}
            {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <button disabled={busy || (!isReset && !canSend)} className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Please wait…" : isReset ? "Reset password" : "Send reset link"}</button>
          </form>
        )}
        {isReset && !message && <Link href={`/forgot-password${query}`} className="block text-sm text-primary hover:underline">Request a new reset link</Link>}
        <Link href={`/login${query}`} className="block text-center text-sm font-medium text-primary hover:underline">{message && isReset ? "Sign in with your new password" : "Back to sign in"}</Link>
      </div>
    </main>
  );
}
