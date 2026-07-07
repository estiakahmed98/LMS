import {
  Download,
  FileText,
  LinkIcon,
  Presentation,
  File,
} from "lucide-react";

type ModuleResource = {
  id: string;
  title: string;
  type: "PDF" | "LINK" | "SLIDES" | "FILE";
  meta: string;
  fileUrl?: string | null;
};

const RESOURCE_TYPE_META: Record<
  ModuleResource["type"],
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

export default function ResourcesTab({
  resources = [],
}: {
  resources: ModuleResource[];
}) {
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

        const content = (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40">
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
              <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
        );

        return resource.fileUrl ? (
          <a
            key={resource.id}
            href={resource.fileUrl}
            target="_blank"
            rel="noreferrer"
          >
            {content}
          </a>
        ) : (
          <div key={resource.id}>{content}</div>
        );
      })}
    </div>
  );
}