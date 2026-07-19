"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  LoaderCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { parseApiJson } from "@/lib/parse-api-json";
import type { LearnerCertificateSummary } from "@/lib/learner-certificate-types";

export default function CertificatesPage() {
  const t = useTranslations();
  const [certificates, setCertificates] = useState<LearnerCertificateSummary[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/learner/certificates", {
          cache: "no-store",
        });
        const data = await parseApiJson<{
          certificates?: LearnerCertificateSummary[];
          error?: string;
        }>(res);
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load certificates.");
        }
        setCertificates(data.certificates ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load certificates.",
        );
        setCertificates([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading certificates…
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  return (
    <>
      <div className="mb-1 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GraduationCap className="h-5 w-5" />
        </span>
        <h1 className="text-3xl font-bold">{t("certificatesPage.title")}</h1>
      </div>
      <p className="mb-8 text-muted-foreground">
        {t("certificatesPage.subtitle")}
      </p>

      {certificates.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {certificates.map((certificate) => (
            <Link
              key={certificate.id}
              href={`/certificates/${certificate.id}`}
              className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg"
            >
              <div className="relative flex h-28 items-center justify-center overflow-hidden bg-linear-to-br from-primary/15 via-primary/5 to-transparent">
                <span className="absolute -right-4 -top-4 h-24 w-24 rounded-full border-8 border-primary/10" />
                <span className="absolute -right-8 top-6 h-16 w-16 rounded-full border-4 border-primary/10" />
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-md">
                  <Award className="h-8 w-8" />
                </span>
              </div>

              <div className="space-y-3 p-5">
                <div>
                  <p className="line-clamp-2 leading-snug font-semibold text-card-foreground">
                    {certificate.courseTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("certificatesPage.certificateNumber", {
                      number: certificate.certificateNumber,
                    })}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    {t("certificatesPage.issued", {
                      date: new Date(certificate.issueDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      ),
                    })}
                  </div>
                  <span className="flex -translate-x-1 items-center gap-1 text-xs font-medium text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                    {t("certificatesPage.view")}{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {certificates.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Award className="h-8 w-8" />
          </span>
          <p className="text-lg font-semibold text-foreground">
            {t("certificatesPage.emptyTitle")}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("certificatesPage.emptyMessage")}
          </p>
        </div>
      )}
    </>
  );
}
