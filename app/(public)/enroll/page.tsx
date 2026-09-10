import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers3,
  Sparkles,
} from "lucide-react";
import { MarketingNav } from "@/components/public/MarketingNav";
import { MarketingFooter } from "@/components/public/MarketingFooter";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const COURSES_PER_PAGE = 6;

export const metadata: Metadata = {
  title: "Course Catalog | BOED LMS",
  description: "Explore practical, expert-led courses available through BOED LMS.",
};

const getPublishedCourses = unstable_cache(
  async (requestedPage: number) => {
    const totalCourses = await prisma.course.count({
      where: { status: "PUBLISHED" },
    });
    const totalPages = Math.max(1, Math.ceil(totalCourses / COURSES_PER_PAGE));
    const currentPage = Math.min(requestedPage, totalPages);
    const courses = await prisma.course.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        description: true,
        durationHours: true,
        level: true,
        coverImage: true,
        category: { select: { name: true } },
        _count: { select: { modules: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * COURSES_PER_PAGE,
      take: COURSES_PER_PAGE,
    });
    return { courses, currentPage, totalCourses, totalPages };
  },
  ["public-course-catalog"],
  { revalidate: 300, tags: ["public-courses"] },
);

function getPageNumbers(currentPage: number, totalPages: number) {
  const count = Math.min(5, totalPages);
  const start = Math.min(
    Math.max(1, currentPage - Math.floor(count / 2)),
    totalPages - count + 1,
  );
  return Array.from({ length: count }, (_, index) => start + index);
}

const pageHref = (page: number) =>
  page === 1 ? "/enroll" : `/enroll?page=${page}`;

export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const { courses, currentPage, totalCourses, totalPages } =
    await getPublishedCourses(requestedPage);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main className="pb-16 pt-24 sm:pt-28">
        <section className="relative overflow-hidden border-b border-border/70">
          <div className="absolute inset-0 bg-linear-to-br from-primary/12 via-background to-background" />
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative container mx-auto px-5 py-12 sm:px-8 sm:py-16">
            <div className="container">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <Sparkles className="size-4" /> Learn. Grow. Succeed.
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Find the right course for your next step
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Explore practical, expert-led courses designed to help you build
                real skills and move your career forward.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <BookOpen className="size-4 text-primary" />
                {totalCourses} {totalCourses === 1 ? "course" : "courses"}{" "}
                available
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-5 py-10 sm:px-8 sm:py-12">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Course catalog
              </p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">
                Explore our latest courses
              </h2>
            </div>
            {totalCourses > 0 && (
              <p className="hidden text-sm text-muted-foreground sm:block">
                Page {currentPage} of {totalPages}
              </p>
            )}
          </div>

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="size-7" />
              </span>
              <h2 className="mt-5 text-xl font-bold text-foreground">
                No courses available yet
              </h2>
              <p className="mt-2 text-muted-foreground">
                Published courses will appear here soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="group flex overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
                >
                  <Link
                    href={`/enroll/${course.id}`}
                    className="flex min-w-0 flex-1 flex-col"
                  >
                    <div className="relative h-52 overflow-hidden bg-linear-to-br from-primary/25 via-primary/10 to-muted">
                      {course.coverImage ? (
                        <Image
                          src={course.coverImage}
                          alt={course.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-primary/50">
                          <BookOpen className="size-16" strokeWidth={1.25} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/10 to-transparent" />
                      {course.category?.name && (
                        <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-background/90 px-3 py-1 text-xs font-semibold text-primary shadow-sm backdrop-blur">
                          {course.category.name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="line-clamp-2 text-xl font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
                        {course.title}
                      </h3>
                      <p className="mt-3 line-clamp-3 min-h-15 text-sm leading-5 text-muted-foreground">
                        {course.description}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border/70 py-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Layers3 className="size-4 text-primary" />
                          {course._count.modules}{" "}
                          {course._count.modules === 1 ? "module" : "modules"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-4 text-primary" />
                          {course.durationHours}h
                        </span>
                        <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary">
                          {course.level.toLowerCase()}
                        </span>
                      </div>
                      <span className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-all group-hover:bg-primary/90">
                        Enroll now{" "}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="Course catalog pagination"
              className="mt-10 flex flex-wrap items-center justify-center gap-2"
            >
              <Link
                href={pageHref(Math.max(1, currentPage - 1))}
                aria-disabled={currentPage === 1}
                tabIndex={currentPage === 1 ? -1 : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                  currentPage === 1 && "pointer-events-none opacity-40",
                )}
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">Previous</span>
              </Link>
              {pageNumbers.map((page) => (
                <Link
                  key={page}
                  href={pageHref(page)}
                  aria-current={page === currentPage ? "page" : undefined}
                  className={cn(
                    "inline-flex size-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                    page === currentPage
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                  )}
                >
                  {page}
                </Link>
              ))}
              <Link
                href={pageHref(Math.min(totalPages, currentPage + 1))}
                aria-disabled={currentPage === totalPages}
                tabIndex={currentPage === totalPages ? -1 : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                  currentPage === totalPages &&
                    "pointer-events-none opacity-40",
                )}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="size-4" />
              </Link>
            </nav>
          )}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
