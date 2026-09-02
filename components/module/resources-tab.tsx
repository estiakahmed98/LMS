"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Eye,
  File,
  FileText,
  LinkIcon,
  Presentation,
  X,
} from "lucide-react";
import type { LearnerModuleResource } from "@/lib/learner-module-types";

const RESOURCE_TYPE_META: Record<
  LearnerModuleResource["type"],
  {
    icon: typeof FileText;
    label: string;
  }
> = {
  PDF: {
    icon: FileText,
    label: "PDF",
  },
  LINK: {
    icon: LinkIcon,
    label: "Link",
  },
  SLIDES: {
    icon: Presentation,
    label: "Slides",
  },
  FILE: {
    icon: File,
    label: "File",
  },
};

const IMAGE_EXTENSIONS = [
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
];

const DOCX_EXTENSIONS = [".doc", ".docx"];
const SLIDES_EXTENSIONS = [".ppt", ".pptx"];

function stripQuery(url: string) {
  const cleaned = url.split("#")[0].split("?")[0];
  return cleaned.toLowerCase();
}

type PreviewKind = "pdf" | "image" | "docx" | "slides" | "none";

function previewKind(resource: LearnerModuleResource): PreviewKind {
  if (!resource.fileUrl) return "none";
  const url = stripQuery(resource.fileUrl);
  if (url.endsWith(".pdf") || resource.type === "PDF") return "pdf";
  if (IMAGE_EXTENSIONS.some((ext) => url.endsWith(ext))) return "image";
  if (DOCX_EXTENSIONS.some((ext) => url.endsWith(ext))) return "docx";
  if (SLIDES_EXTENSIONS.some((ext) => url.endsWith(ext))) return "slides";
  return "none";
}

// Renders entirely in the browser (mammoth converts the .docx buffer to
// HTML client-side) — no external viewer service, no server-side
// conversion, works the same on localhost and in production.
function DocxPreview({ fileUrl }: { fileUrl: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setError(false);

    (async () => {
      try {
        const [response, mammothModule] = await Promise.all([
          fetch(fileUrl),
          import("mammoth"),
        ]);
        const mammoth = mammothModule.default ?? mammothModule;
        const arrayBuffer = await response.arrayBuffer();
        const { value } = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setHtml(value);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <p>This document couldn&apos;t be previewed.</p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Download instead
        </a>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Loading document...
      </div>
    );
  }

  return (
    <div
      className="prose prose-sm max-w-none p-6 text-card-foreground"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ResourcePreviewModal({
  resource,
  onClose,
}: {
  resource: LearnerModuleResource;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const kind = previewKind(resource);
  const fileUrl = resource.fileUrl as string;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={resource.title}
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-card-foreground">
              {resource.title}
            </p>
            {resource.meta && (
              <p className="text-xs text-muted-foreground">{resource.meta}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-muted/20">
          {kind === "pdf" && (
            <iframe
              src={fileUrl}
              title={resource.title}
              className="h-full w-full border-0"
            />
          )}

          {kind === "image" && (
            <div className="flex h-full w-full items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={resource.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          {kind === "docx" && <DocxPreview fileUrl={fileUrl} />}

          {(kind === "slides" || kind === "none") && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              <p>
                {kind === "slides"
                  ? "Slide decks can't be previewed here yet."
                  : "This file type can't be previewed here."}
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {kind === "slides" ? "Download instead" : "Open in new tab"}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResourcesTab({
  resources = [],
}: {
  resources: LearnerModuleResource[];
}) {
  const [activeResource, setActiveResource] =
    useState<LearnerModuleResource | null>(null);

  if (resources.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
        No resources added for this module.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resources.map((resource) => {
        const meta = RESOURCE_TYPE_META[resource.type] ?? RESOURCE_TYPE_META.FILE;
        const Icon = meta.icon;
        const previewableKind = previewKind(resource);
        const canPreview =
          previewableKind === "pdf" ||
          previewableKind === "image" ||
          previewableKind === "docx";

        return (
          <div
            key={resource.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-card-foreground">
                  {resource.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {meta.label}
                  {resource.meta ? ` • ${resource.meta}` : ""}
                </p>
              </div>
            </div>

            {resource.fileUrl && (
              <div className="flex shrink-0 items-center gap-1">
                {canPreview && (
                  <button
                    type="button"
                    onClick={() => setActiveResource(resource)}
                    aria-label={`View ${resource.title}`}
                    title="View"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                )}

                <a
                  href={resource.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Download ${resource.title}`}
                  title="Download"
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        );
      })}

      {activeResource && (
        <ResourcePreviewModal
          resource={activeResource}
          onClose={() => setActiveResource(null)}
        />
      )}
    </div>
  );
}
