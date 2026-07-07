"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Clock, Layers, LoaderCircle } from "lucide-react";

type EnrollmentStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

type LearnerEnrollment = {
  id: string;
  status: EnrollmentStatus;
  progress: number;
  course: {
    id: string;
    title: string;
    description: string;
    durationHours: number;
    coverImage: string | null;
    modules: {
      id: string;
    }[];
  };
};

function getEnrollmentStatusLabel(status: EnrollmentStatus) {
  switch (status) {
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "WITHDRAWN":
      return "Withdrawn";
    case "PENDING":
    default:
      return "Pending";
  }
}

function getEnrollmentStatusClass(status: EnrollmentStatus) {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "REJECTED":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "WITHDRAWN":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "PENDING":
    default:
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  }
}

function getDisabledButtonLabel(status: EnrollmentStatus) {
  switch (status) {
    case "PENDING":
      return "Waiting for Approval";
    case "REJECTED":
      return "Enrollment Rejected";
    case "WITHDRAWN":
      return "Enrollment Withdrawn";
    case "APPROVED":
    default:
      return "Continue";
  }
}

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState<LearnerEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/learner/courses", {
          cache: "no-store",
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load courses.");
        }

        setEnrollments(result.enrollments || []);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load courses.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  if (loading) {
    return (
      <div className="px-6 py-20 text-center">
        <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-20 text-center">
        <h1 className="mb-2 text-xl font-bold">Failed to load courses</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <h1 className="mb-2 text-3xl font-bold">My Courses</h1>

      <p className="mb-8 text-muted-foreground">
        Continue learning from your enrolled courses.
      </p>

      {enrollments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <h2 className="mb-2 text-lg font-bold">No courses yet</h2>

          <p className="mb-4 text-muted-foreground">
            Browse the catalog and enroll in a course.
          </p>

          <Link
            href="/enroll"
            className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {enrollments.map(({ course, status, progress }) => {
            const canContinue = status === "APPROVED";

            return (
              <div
                key={course.id}
                className="overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-lg"
              >
                <div className="relative h-40 overflow-hidden">
                  {course.coverImage ? (
                    <Image
                      src={course.coverImage}
                      alt={course.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-primary/10" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold text-white">
                      {course.title}
                    </h3>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {course.description}
                  </p>

                  <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="h-4 w-4" />
                      {course.modules.length} modules
                    </span>

                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.durationHours}h
                    </span>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getEnrollmentStatusClass(
                        status,
                      )}`}
                    >
                      {getEnrollmentStatusLabel(status)}
                    </span>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {canContinue ? (
                    <Link
                      href={`/courses/${course.id}`}
                      className="block w-full rounded-lg bg-primary px-4 py-2 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Continue
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="block w-full cursor-not-allowed rounded-lg bg-muted px-4 py-2 text-center font-medium text-muted-foreground opacity-70"
                    >
                      {getDisabledButtonLabel(status)}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}