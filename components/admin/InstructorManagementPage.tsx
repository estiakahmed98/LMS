"use client";

import AdminLayout from "@/components/AdminLayout";
import { useTranslations } from "next-intl";
import { getInitials } from "@/lib/auth";
import {
  getInstructors,
  getLiveClassesByInstructorId,
  getSessionsByInstructorId,
} from "@/lib/mock-data";

export default function InstructorManagementPage() {
  const t = useTranslations("adminInstructorsPage");
  const tAdmin = useTranslations("admin");
  const instructors = getInstructors();

  return (
    <AdminLayout title={tAdmin("instructorManagement")}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">{tAdmin("instructorManagement")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instructors.map((instructor) => {
            const classes = getLiveClassesByInstructorId(instructor.id);
            const sessions = getSessionsByInstructorId(instructor.id);
            const upcoming = sessions.filter((s) => s.status === "UPCOMING").length;
            const completed = sessions.filter((s) => s.status === "COMPLETED").length;
            const missed = sessions.filter((s) => s.status === "MISSED").length;

            return (
              <div key={instructor.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {getInitials(instructor.name)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-card-foreground truncate">{instructor.name}</h2>
                    <p className="text-xs text-muted-foreground truncate">{instructor.email}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 py-2">
                    <p className="text-lg font-bold text-card-foreground">{classes.length}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t("stats.classes")}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 py-2">
                    <p className="text-lg font-bold text-card-foreground">{upcoming}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t("stats.upcoming")}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 py-2">
                    <p className="text-lg font-bold text-card-foreground">{completed}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t("stats.completed")}
                    </p>
                  </div>
                </div>

                {missed > 0 && (
                  <p className="mt-3 text-xs font-semibold text-orange-600">
                    {t("stats.missedCount", { count: missed })}
                  </p>
                )}

                <div className="mt-4 space-y-1.5">
                  {classes.slice(0, 3).map((liveClass) => (
                    <p key={liveClass.id} className="text-xs text-muted-foreground truncate">
                      • {liveClass.title}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
