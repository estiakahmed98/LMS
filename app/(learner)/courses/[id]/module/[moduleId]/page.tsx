"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import ModuleDetailClient from "@/components/module/module-detail-client";
import type {
  LearnerCourse,
  LearnerModule,
  LearnerModuleNote,
  LearnerModuleResource,
  LearnerQuiz,
} from "@/lib/learner-module-types";

interface LearnerModulePayload {
  course: LearnerCourse;
  module: LearnerModule;
  quiz: LearnerQuiz | null;
  notes: LearnerModuleNote[];
  resources: LearnerModuleResource[];
  userId: string;
}

export default function ModuleDetailPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  const { id, moduleId } = use(params);
  const [data, setData] = useState<LearnerModulePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadModule() {
      try {
        setData(null);
        setError(null);

        // Fetch from the browser so the learner's authenticated session is
        // included naturally. The previous server-to-server self-request
        // could lose its session/proxy context and converted every API error
        // into a misleading Next.js 404 page.
        const response = await fetch(
          `/api/learner/courses/${encodeURIComponent(id)}/modules/${encodeURIComponent(moduleId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load module.");
        }

        setData({
          ...result,
          course: {
            ...result.course,
            modules: result.course?.modules ?? [],
          },
          quiz: result.quiz ?? null,
          notes: result.notes ?? [],
          resources: result.resources ?? [],
          userId: result.userId ?? "",
        });
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load module.",
        );
      }
    }

    void loadModule();
    return () => controller.abort();
  }, [id, moduleId]);

  if (error) {
    return (
      <div className="px-6 py-20 text-center">
        <h1 className="mb-2 text-xl font-bold">Module unavailable</h1>
        <p className="mb-6 text-muted-foreground">{error}</p>
        <Link
          href={`/courses/${id}`}
          className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Back to Course
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-6 py-20 text-center">
        <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading module...</p>
      </div>
    );
  }

  return (
    <ModuleDetailClient
      course={data.course}
      module={data.module}
      quiz={data.quiz}
      notes={data.notes}
      resources={data.resources}
      userId={data.userId}
    />
  );
}
