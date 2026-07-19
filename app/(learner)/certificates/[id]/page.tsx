"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Check,
  Download,
  Share2,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { parseApiJson } from "@/lib/parse-api-json";
import type { LearnerCertificateDetail } from "@/lib/learner-certificate-types";

export default function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations();
  const [linkCopied, setLinkCopied] = useState(false);
  const [certificate, setCertificate] =
    useState<LearnerCertificateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFoundError, setNotFoundError] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      setNotFoundError(false);
      try {
        const res = await fetch(`/api/learner/certificates/${id}`, {
          cache: "no-store",
        });
        const data = await parseApiJson<{
          certificate?: LearnerCertificateDetail;
          error?: string;
        }>(res);
        if (res.status === 404) {
          setNotFoundError(true);
          return;
        }
        if (!res.ok || !data.certificate) {
          throw new Error(data.error ?? "Failed to load certificate.");
        }
        setCertificate(data.certificate);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load certificate.",
        );
        setCertificate(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleShare() {
    if (!certificate) return;
    const shareUrl = window.location.href;
    const shareData = {
      title: t("certificatesPage.shareTitle", {
        name: certificate.studentName,
      }),
      text: t("certificatesPage.shareText", {
        course: certificate.courseTitle,
      }),
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading certificate…
      </div>
    );
  }

  if (notFoundError) {
    notFound();
  }

  if (error || !certificate) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error ?? "Certificate could not be loaded."}
      </div>
    );
  }

  return (
    <div className="p-4">
      <Link
        href="/certificates"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft size={16} />
        {t("certificatesPage.backToCertificates")}
      </Link>

      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {t("certificatesPage.yourCertificate")}
        </h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 transition-colors hover:bg-muted">
            <Download className="h-4 w-4" />
            {t("certificatesPage.download")}
          </button>
          <button
            onClick={() => void handleShare()}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 transition-colors hover:bg-muted"
          >
            {linkCopied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            {linkCopied
              ? t("certificatesPage.linkCopied")
              : t("certificatesPage.share")}
          </button>
        </div>
      </div>

      <div className="relative mx-auto mt-6 max-w-3xl rounded-lg border-4 border-primary bg-white p-10 text-center shadow-xl">
        <div className="rounded-md border border-border/60 p-10">
          <Image
            src="/pstc_logo.png"
            alt="BOED"
            width={120}
            height={40}
            className="mx-auto mb-6 h-10 w-auto object-contain"
          />

          <h2 className="mb-6 font-serif text-3xl font-bold tracking-wide text-gray-800">
            {t("certificatesPage.completionTitle")}
          </h2>

          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            {t("certificatesPage.certificateId", {
              number: certificate.certificateNumber,
            })}
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            {t("certificatesPage.certifyThat")}
          </p>

          <p className="mb-2 inline-block border-b border-border/60 px-8 pb-4 text-3xl font-bold text-primary">
            {certificate.studentName}
          </p>

          <p className="mt-6 mb-2 text-sm text-muted-foreground">
            {t("certificatesPage.hasCompleted")}
          </p>
          <p className="mb-2 text-lg font-semibold text-gray-800">
            {certificate.courseTitle}
          </p>
          <p className="mb-10 text-sm text-muted-foreground">
            {certificate.scorePercent !== null
              ? `${t("certificatesPage.withScoreOn", {
                  score: certificate.scorePercent,
                })} `
              : `${t("certificatesPage.on")} `}
            {new Date(certificate.issueDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          <div className="mt-12 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="text-left">
                <p className="font-serif text-xl text-gray-700 italic leading-none">
                  M. A. Rahman
                </p>
                <div className="mt-1 border-t border-gray-400 pt-1">
                  <p className="text-xs text-muted-foreground">
                    {t("certificatesPage.programDirector")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center text-primary">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <p className="mt-1 text-[10px] font-semibold tracking-wide">
                {t("certificatesPage.verifiedBy")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
