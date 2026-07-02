import type { ModuleResource } from "@/lib/mock-modules";
import { FileText, Link2, Presentation } from "lucide-react";

const ICONS: Record<ModuleResource["type"], typeof FileText> = {
  PDF: FileText,
  LINK: Link2,
  SLIDES: Presentation,
};

export default function ResourcesTab({
  resources,
}: {
  resources: ModuleResource[];
}) {
  return (
    <div className="space-y-2">
      {resources.map((resource) => {
        const Icon = ICONS[resource.type];
        return (
          <div
            key={resource.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-card-foreground truncate">
                {resource.title}
              </p>
              <p className="text-xs text-muted-foreground">{resource.meta}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
