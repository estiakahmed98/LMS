"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "twoFactor">("credentials");
  const [role, setRole] = useState("Super Admin");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  async function continueSignIn() {
    if (step === "credentials") {
      setAuthError(null);
      setSubmitting(true);
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setAuthError("Invalid email or password.");
          return;
        }

        setStep("twoFactor");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[90vw] items-center gap-8 lg:grid-cols-[1fr_420px]">
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-card">
              <Image
                src="/pstc_logo.png"
                alt="BOED"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                BOED LMS
              </p>
              <h1 className="text-3xl font-bold text-card-foreground">
                Admin Portal
              </h1>
            </div>
          </div>

          <div className="max-w-2xl space-y-4">
            <h2 className="text-4xl font-bold leading-tight text-card-foreground">
              Restricted access for administrative control.
            </h2>
            <p className="text-base text-muted-foreground">
              All sign-ins, role changes, grade overrides, and certificate
              actions are logged for audit and compliance.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: LockKeyhole,
                title: "Encrypted sessions",
                body: "Token-backed admin access",
              },
              {
                icon: ShieldCheck,
                title: "Role access",
                body: "Module-level permissions",
              },
              {
                icon: KeyRound,
                title: "Audit trail",
                body: "Every sensitive action logged",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <p className="font-semibold text-card-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Secure sign-in
            </p>
            <h2 className="mt-1 text-xl font-bold text-card-foreground">
              {step === "credentials"
                ? "Sign in to your admin account"
                : "Two-Factor Authentication"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "credentials"
                ? "Choose the role you are signing in as."
                : "Enter the 6-digit code sent to your registered device."}
            </p>
          </div>

          {step === "credentials" ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-card-foreground">
                Email Address
                <span className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    type="email"
                  />
                </span>
              </label>

              <label className="block text-sm font-medium text-card-foreground">
                Password
                <span className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
                  <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    type="password"
                  />
                </span>
              </label>

              <label className="block text-sm font-medium text-card-foreground">
                Role
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option>Super Admin</option>
                  <option>Course Manager</option>
                  <option>Examiner</option>
                  <option>Report Viewer</option>
                </select>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <input
                    key={index}
                    value={code[index] ?? ""}
                    onChange={(event) => {
                      const next = code.padEnd(6, " ").split("");
                      next[index] = event.target.value.slice(-1);
                      setCode(next.join("").trimEnd());
                    }}
                    className="h-12 rounded-lg border border-border bg-background text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-primary/40"
                    maxLength={1}
                    inputMode="numeric"
                  />
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  Code expires in 00:47
                </span>
                <button type="button" className="font-semibold text-primary">
                  Resend Code
                </button>
              </div>
            </div>
          )}

          {authError && (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {authError}
            </p>
          )}

          <button
            onClick={() => void continueSignIn()}
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {step === "credentials" ? "Continue" : `Verify as ${role}`}
          </button>
        </section>
      </div>
    </main>
  );
}
