"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  Layers,
  LoaderCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";

const COURSES_PER_PAGE = 9;

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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EnrollmentStatus>(
    "ALL",
  );
  const [progressFilter, setProgressFilter] = useState<
    "ALL" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
  >("ALL");
  const [sort, setSort] = useState<"RECENT" | "TITLE" | "PROGRESS">("RECENT");
  const [currentPage, setCurrentPage] = useState(1);

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

  const filteredEnrollments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return enrollments
      .filter((enrollment) => {
        const matchesQuery =
          !normalizedQuery ||
          enrollment.course.title.toLowerCase().includes(normalizedQuery) ||
          enrollment.course.description.toLowerCase().includes(normalizedQuery);
        const matchesStatus =
          statusFilter === "ALL" || enrollment.status === statusFilter;
        const matchesProgress =
          progressFilter === "ALL" ||
          (progressFilter === "NOT_STARTED" && enrollment.progress === 0) ||
          (progressFilter === "IN_PROGRESS" &&
            enrollment.progress > 0 &&
            enrollment.progress < 100) ||
          (progressFilter === "COMPLETED" && enrollment.progress === 100);

        return matchesQuery && matchesStatus && matchesProgress;
      })
      .sort((a, b) => {
        if (sort === "TITLE") {
          return a.course.title.localeCompare(b.course.title);
        }
        if (sort === "PROGRESS") return b.progress - a.progress;
        return 0;
      });
  }, [enrollments, progressFilter, query, sort, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [progressFilter, query, sort, statusFilter]);

  const totalPages = Math.ceil(filteredEnrollments.length / COURSES_PER_PAGE);
  const paginatedEnrollments = filteredEnrollments.slice(
    (currentPage - 1) * COURSES_PER_PAGE,
    currentPage * COURSES_PER_PAGE,
  );

  const approvedCount = enrollments.filter(
    (enrollment) => enrollment.status === "APPROVED",
  ).length;
  const completedCount = enrollments.filter(
    (enrollment) => enrollment.progress === 100,
  ).length;

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
    <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-br from-primary/12 via-card to-card p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <BookOpen className="h-3.5 w-3.5" /> Learning workspace
            </div>
            <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Find a course quickly and continue from where you left off.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
            <SummaryStat label="Enrolled" value={enrollments.length} />
            <SummaryStat label="Approved" value={approvedCount} />
            <SummaryStat label="Completed" value={completedCount} />
          </div>
        </div>
      </div>

      {enrollments.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <div className="grid gap-3 lg:grid-cols-12">
            <label className="relative lg:col-span-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by course title or description..."
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <FilterSelect
              value={statusFilter}
              onChange={(value) =>
                setStatusFilter(value as typeof statusFilter)
              }
              label="Enrollment status"
              options={[
                ["ALL", "All statuses"],
                ["APPROVED", "Approved"],
                ["PENDING", "Pending"],
                ["REJECTED", "Rejected"],
                ["WITHDRAWN", "Withdrawn"],
              ]}
            />
            <FilterSelect
              value={progressFilter}
              onChange={(value) =>
                setProgressFilter(value as typeof progressFilter)
              }
              label="Learning progress"
              options={[
                ["ALL", "All progress"],
                ["NOT_STARTED", "Not started"],
                ["IN_PROGRESS", "In progress"],
                ["COMPLETED", "Completed"],
              ]}
            />
            <FilterSelect
              value={sort}
              onChange={(value) => setSort(value as typeof sort)}
              label="Sort courses"
              options={[
                ["RECENT", "Recently enrolled"],
                ["TITLE", "Course title"],
                ["PROGRESS", "Highest progress"],
              ]}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Showing {filteredEnrollments.length} of {enrollments.length} courses
          </div>
        </div>
      )}

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
      ) : filteredEnrollments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
          <Search className="mx-auto mb-3 h-9 w-9 text-muted-foreground/60" />
          <h2 className="font-semibold">No matching courses</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try changing your search or filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("ALL");
              setProgressFilter("ALL");
            }}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginatedEnrollments.map(({ course, status, progress }) => {
            const canContinue = status === "APPROVED";

            return (
              <div
                key={course.id}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="relative h-40 overflow-hidden">
                  {course.coverImage ? (
                    <Image
                      src={course.coverImage}
                      alt={course.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
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
                      className="block w-full rounded-xl bg-primary px-4 py-2.5 text-center font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
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

      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3 backdrop-blur">
      <p className="text-xl font-bold">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: [string, string][];
}) {
  return (
    <label className="lg:col-span-2">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
