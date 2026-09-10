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
  showWatermark?: boolean;
  className?: string;
};

function formatIssueDate(value?: string) {
  if (!value) return "DD.MM.YYYY";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(value))
    .replaceAll("/", ".");
}

function FrameOrnament() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1120 792"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <rect
        x="10"
        y="10"
        width="1100"
        height="772"
        rx="2"
        fill="none"
        stroke="var(--certificate-deep)"
        strokeWidth="20"
      />
      <rect
        x="29"
        y="29"
        width="1062"
        height="734"
        fill="none"
        stroke="var(--certificate-accent)"
        strokeWidth="3"
      />
      <rect
        x="39"
        y="39"
        width="1042"
        height="714"
        fill="none"
        stroke="var(--certificate-deep)"
        strokeWidth="1.5"
      />
      <rect
        x="48"
        y="48"
        width="1024"
        height="696"
        fill="none"
        stroke="var(--certificate-accent)"
        strokeWidth="1"
      />
      <rect
        x="20"
        y="20"
        width="1080"
        height="752"
        fill="none"
        stroke="var(--certificate-accent)"
        strokeWidth="6"
        strokeDasharray="2 6"
        opacity="0.8"
      />
      <g
        fill="none"
        stroke="var(--certificate-accent)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M58 142V63h94M58 112c21-8 17-30 17-49M87 63c0 22 20 26 42 17M67 75l16 16M58 130l9-9" />
        <path d="M1062 142V63h-94m94 49c-21-8-17-30-17-49m-12 0c0 22-20 26-42 17m62-5-16 16m25 39-9-9" />
        <path d="M58 650v79h94m-94-49c21 8 17 30 17 49m12 0c0-22 20-26 42-17m-62 5 16-16m-25-39 9 9" />
        <path d="M1062 650v79h-94m94-49c-21 8-17 30-17 49m-12 0c0-22-20-26-42-17m62 5-16-16m25-39-9 9" />
        <circle cx="58" cy="63" r="4" fill="var(--certificate-accent)" />
        <circle cx="1062" cy="63" r="4" fill="var(--certificate-accent)" />
        <circle cx="58" cy="729" r="4" fill="var(--certificate-accent)" />
        <circle cx="1062" cy="729" r="4" fill="var(--certificate-accent)" />
      </g>
    </svg>
  );
}

function TitleFlourish() {
  return (
    <div className="mt-[1.4cqw] flex items-center justify-center gap-[1cqw] text-(--certificate-accent)">
      <span className="h-px w-[10cqw] bg-current" />
      <span className="h-[0.65cqw] w-[0.65cqw] rotate-45 border border-current" />
      <span className="h-[0.35cqw] w-[0.35cqw] rotate-45 bg-current" />
      <span className="h-[0.65cqw] w-[0.65cqw] rotate-45 border border-current" />
      <span className="h-px w-[10cqw] bg-current" />
    </div>
  );
}

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
  showWatermark = false,
  className = "",
}: CertificatePreviewProps) {
  const style = {
    "--certificate-accent": accentColor || "#53657d",
    "--certificate-deep": "#424957",
  } as CSSProperties;
  const isFormal = fontFamily !== "SANS_MODERN";

  return (
    <article
      className={`relative mx-auto aspect-[1.414/1] w-full max-w-5xl overflow-hidden bg-[#fdfdfc] text-center text-[#333842] shadow-xl [container-type:inline-size] print:max-w-none print:shadow-none ${className}`}
      style={style}
    >
      <FrameOrnament />
      {showWatermark ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden text-(--certificate-accent)"
        >
          <img
            src="/assets/shapla-watermark.svg"
            alt=""
            className="absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.075]"
          />
          <div className="absolute inset-[-18%] grid -rotate-20 grid-cols-3 content-center gap-x-[5cqw] gap-y-[14cqw] opacity-[0.07]">
            {Array.from({ length: 12 }, (_, index) => (
              <span
                key={index}
                className="whitespace-nowrap text-[clamp(8px,1.6cqw,17px)] font-bold uppercase tracking-[0.18em]"
              >
                {issuer}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="absolute inset-[7%]">
        <header className="w-full pt-[1.2cqw]">
          <h2
            className={`text-[clamp(15px,4.6cqw,46px)] font-bold uppercase leading-none tracking-[-0.04em] text-(--certificate-deep) ${isFormal ? "font-serif" : "font-sans"}`}
          >
            Certificate of Completion
          </h2>
          <TitleFlourish />
        </header>

        <div className="absolute inset-x-0 top-[18%] w-full">
          <p className="text-[clamp(7px,1.45cqw,15px)] text-[#59606a]">
            This is to certify that
          </p>
          <h3
            className="mt-[0.3cqw] truncate px-[4cqw] text-[clamp(20px,5.2cqw,54px)] font-normal leading-[1.05] text-[#303642]"
            style={{
              fontFamily:
                '"Brush Script MT", "Segoe Script", "Snell Roundhand", cursive',
            }}
          >
            {student}
          </h3>
          <p className="mx-auto mt-[1.9cqw] max-w-[78%] text-[clamp(7px,1.35cqw,14px)] leading-[1.45] text-[#4f555f]">
            has successfully completed the requirements of the
          </p>
          <p className="mx-auto mt-[0.25cqw] max-w-[80%] truncate text-[clamp(8px,1.55cqw,16px)] font-bold text-[#303642]">
            {course}
          </p>
          <div className="mx-auto mt-[2.1cqw] flex max-w-[62%] items-center gap-[1.2cqw] text-(--certificate-accent)">
            <span className="h-px flex-1 bg-current/45" />
            <span className="h-[0.45cqw] w-[0.45cqw] rotate-45 bg-current" />
            <span className="h-px flex-1 bg-current/45" />
          </div>
          <p className="mx-auto mt-[1.2cqw] max-w-[62%] text-[clamp(6px,1.05cqw,11px)] leading-[1.5] text-[#656b74]">
            Awarded in recognition of dedication, commitment, and the successful
            fulfillment of all course requirements.
          </p>
        </div>

        <div className="absolute inset-x-[9%] top-[61%] grid grid-cols-[1fr_0.8fr_1fr] items-end gap-[3cqw]">
          <div className="min-w-0 text-center">
            <div className="mx-auto flex h-[5.2cqw] min-h-4 items-end justify-center">
              {directorSignatureUrl ? (
                <img
                  src={directorSignatureUrl}
                  alt="Director signature"
                  className="max-h-full max-w-[14cqw] object-contain"
                />
              ) : (
                <span
                  className="truncate text-[clamp(7px,1.7cqw,18px)] text-(--certificate-deep)"
                  style={{
                    fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                  }}
                >
                  Authorized Signature
                </span>
              )}
            </div>
            <div className="mt-[0.55cqw] border-t border-[#68707d] pt-[0.55cqw]">
              <p className="text-[clamp(6px,1.05cqw,11px)] font-bold">
                Program Director
              </p>
              <p className="mt-[0.15cqw] text-[clamp(5px,0.8cqw,9px)] text-[#666d76]">
                Authorized signatory
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            {officialSealUrl ? (
              <img
                src={officialSealUrl}
                alt="Official seal"
                className="h-[10cqw] w-[10cqw] max-h-24 max-w-24 object-contain"
              />
            ) : (
              <div className="relative flex h-[9.5cqw] w-[9.5cqw] max-h-24 max-w-24 items-center justify-center rounded-full border-[0.7cqw] border-double border-(--certificate-accent) bg-(--certificate-accent) text-white shadow-sm">
                <div className="absolute inset-[0.5cqw] rounded-full border border-dashed border-white/70" />
                <div className="relative">
                  <p className="text-[clamp(5px,0.75cqw,8px)] font-bold uppercase tracking-[0.12em]">
                    Awarded
                  </p>
                  <p className="text-[clamp(7px,1.25cqw,13px)] font-black">
                    {new Date(issueDate ?? Date.now()).getFullYear()}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 border-b border-[#68707d] pb-[0.55cqw] text-center">
            <p className="truncate text-[clamp(7px,1.2cqw,13px)] font-bold">
              {issuer}
            </p>
            <p className="mt-[0.15cqw] text-[clamp(5px,0.8cqw,9px)] text-[#666d76]">
              Issuing organization
            </p>
          </div>
        </div>

        <footer className="absolute inset-x-[1.5%] bottom-[1.7cqw] grid grid-cols-3 gap-[2cqw] text-[clamp(5px,0.92cqw,10px)] font-semibold text-[#3f4650]">
          <p className="truncate text-left">
            Certificate ID: {certificateNumber || "PREVIEW-000001"}
          </p>
          <p className="truncate">{issuer}</p>
          <p className="text-right">Awarded on: {formatIssueDate(issueDate)}</p>
        </footer>
      </div>
    </article>
  );
}
