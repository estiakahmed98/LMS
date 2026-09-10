import type { CSSProperties } from "react";

type CertificatePreviewProps = {
  student: string;
  course: string;
  issuer: string;
  certificateNumber?: string;
  issueDate?: string;
  fontFamily?: string;
  directorSignatureUrl?: string | null;
  officialSealUrl?: string | null;
  accentColor?: string;
  className?: string;
};

export function CertificatePreview({
  student,
  course,
  issuer,
  certificateNumber,
  issueDate,
  fontFamily,
  directorSignatureUrl,
  officialSealUrl,
  accentColor,
  className = "",
}: CertificatePreviewProps) {
  const style = {
    "--certificate-accent": accentColor || "var(--primary)",
    "--certificate-deep": "var(--foreground)",
  } as CSSProperties;

  return (
    <article
      className={`relative mx-auto aspect-[1.414/1] max-w-5xl overflow-hidden bg-white text-center text-gray-900 shadow-xl print:max-w-none print:rounded-none print:shadow-none ${className}`}
      style={style}
    >
      <div className="absolute inset-0 border-10 border-(--certificate-deep)" />
      <div className="absolute left-0 top-0 h-24 w-72 bg-(--certificate-accent) [clip-path:polygon(0_0,100%_0,72%_38%,0_38%)]" />
      <div className="absolute right-0 top-0 h-56 w-72 bg-(--certificate-accent) [clip-path:polygon(43%_0,100%_0,100%_100%)]" />
      <div className="absolute bottom-0 left-0 h-56 w-72 bg-(--certificate-accent) [clip-path:polygon(0_0,57%_100%,0_100%)]" />
      <div className="absolute bottom-0 right-0 h-24 w-72 bg-(--certificate-accent) [clip-path:polygon(28%_62%,100%_62%,100%_100%,0_100%)]" />
      <div className="absolute inset-6 border border-(--certificate-deep)/30 p-8 sm:inset-10 sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-(--certificate-deep) sm:text-sm">
          Certificate of Achievement
        </p>
        {certificateNumber ? (
          <p className="mt-3 text-[10px] text-gray-500 sm:text-xs">
            Certificate ID: {certificateNumber}
          </p>
        ) : null}
        <p className="mt-8 text-xs text-gray-500 sm:mt-12 sm:text-base">
          This certificate is proudly awarded to
        </p>
        <h2
          className={`mx-auto mt-3 max-w-2xl border-b border-gray-400 pb-3 text-3xl font-bold sm:text-5xl ${fontFamily === "SERIF_FORMAL" ? "font-serif" : ""}`}
        >
          {student}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-xs italic leading-5 text-gray-600 sm:mt-7 sm:text-base">
          has successfully completed the course
        </p>
        <h3 className="mt-2 text-xl font-semibold text-(--certificate-deep) sm:text-3xl">
          {course}
        </h3>
        {issueDate ? (
          <p className="mt-2 text-[10px] text-gray-500 sm:mt-4 sm:text-sm">
            Issued on{" "}
            {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
              new Date(issueDate),
            )}
          </p>
        ) : null}

        <div className="absolute inset-x-8 bottom-8 flex items-end justify-between gap-4 sm:inset-x-16 sm:bottom-12 sm:gap-8">
          <div className="w-32 text-center sm:w-40">
            {directorSignatureUrl ? (
              <img
                src={directorSignatureUrl}
                alt="Director signature"
                className="mx-auto h-14 max-w-36 object-contain"
              />
            ) : (
              <div className="h-14" />
            )}
            <p className="border-t border-gray-400 pt-2 text-[10px] sm:text-xs">
              Program Director
            </p>
          </div>
          <p className="wrap-break-word text-lg font-bold text-(--certificate-accent) sm:text-2xl">
            {issuer}
          </p>
          <div className="flex w-32 justify-center sm:w-40">
            {officialSealUrl ? (
              <img
                src={officialSealUrl}
                alt="Official seal"
                className="h-20 w-20 object-contain"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-(--certificate-accent) text-[9px] font-semibold uppercase text-(--certificate-accent) sm:h-20 sm:w-20">
                Verified
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
