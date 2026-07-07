import Link from "next/link";
import { Clock, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCurrentUserServer } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

function getEnrollmentStatusLabel(
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN",
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  switch (status) {
    case "APPROVED":
      return t("learnerCoursesPage.status.approved");
    case "REJECTED":
      return t("learnerCoursesPage.status.rejected");
    case "WITHDRAWN":
      return t("learnerCoursesPage.status.withdrawn");
    case "PENDING":
    default:
      return t("learnerCoursesPage.status.pending");
  }
}

export default async function MyCoursesPage() {
  const t = await getTranslations();
  const currentUser = await getCurrentUserServer("/courses");
  const userId = currentUser?.id ?? "";

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
    },
    include: {
      course: {
        include: {
          modules: true,
        },
      },
    },
    orderBy: {
      enrolledAt: "desc",
    },
  });

  return (
    <div className="px-6 py-8">
      <h1 className="mb-2 text-3xl font-bold">{t("learnerCoursesPage.title")}</h1>
      <p className="mb-8 text-muted-foreground">
        {t("learnerCoursesPage.subtitle")}
      </p>

      {enrollments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <h2 className="mb-2 text-lg font-bold">
            {t("learnerCoursesPage.emptyTitle")}
          </h2>
          <p className="mb-4 text-muted-foreground">
            {t("learnerCoursesPage.emptyDescription")}
          </p>
          <Link
            href="/enroll"
            className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("learnerCoursesPage.browseCourses")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map(({ course, status, progress }) => (
            <div
              key={course.id}
              className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-32 bg-linear-to-br from-primary/20 to-primary/10 p-4 flex flex-col justify-end">
                <h3 className="font-bold text-lg text-card-foreground">
                  {course.title}
                </h3>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  {course.description}
                </p>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    {t("learnerCoursesPage.modules", {
                      count: course.modules.length,
                    })}
                  </span>

                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {t("learner.hours", { hours: course.durationHours })}
                  </span>

                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {getEnrollmentStatusLabel(status, t)}
                  </span>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t("learnerCoursesPage.progress")}
                    </span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <Link
                  href={`/courses/${course.id}`}
                  className="block w-full text-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  {t("learnerCoursesPage.continue")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
