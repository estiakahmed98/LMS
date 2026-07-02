import type { UiModule } from "@/lib/mock-modules";

export default function OverviewTab({ module }: { module: UiModule }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      {module.description}
    </p>
  );
}
