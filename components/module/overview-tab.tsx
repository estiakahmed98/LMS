import type { LearnerCourseModule } from "@/lib/learner-module-types";

export default function OverviewTab({ module }: { module: LearnerCourseModule }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      {module.overview || "No overview available for this module."}
    </p>
  );
}
