import Link from "next/link";
import Image from "next/image";
import PublicNav from "@/components/learner/PublicNav";
import { prisma } from "@/lib/prisma";
import { Clock, Layers } from "lucide-react";

export default async function EnrollPage() {
  const courses = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      description: true,
      durationHours: true,
      level: true,
      status: true,
      coverImage: true,
      createdAt: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      modules: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <main className="mx-auto p-6">
        <h1 className="mb-2 text-3xl font-bold text-card-foreground">
          Course Catalog
        </h1>

        <p className="mb-8 text-muted-foreground">
          Browse and enroll in courses to start your learning journey.
        </p>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <h2 className="mb-2 text-lg font-bold text-card-foreground">
              No courses available
            </h2>
            <p className="text-muted-foreground">
              Published courses will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-lg"
              >
                <div className="relative flex h-40 flex-col justify-end overflow-hidden bg-linear-to-br from-primary/20 to-primary/10 p-4">
                  {course.coverImage ? (
                    <Image
                      src={course.coverImage}
                      alt={course.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : null}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  <div className="relative z-10">
                    {course.category?.name && (
                      <span className="mb-2 inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {course.category.name}
                      </span>
                    )}

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

                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {course.level}
                    </span>
                  </div>

                  <Link
                    href={`/enroll/${course.id}`}
                    className="block w-full rounded-lg bg-primary px-4 py-2 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Enroll
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}