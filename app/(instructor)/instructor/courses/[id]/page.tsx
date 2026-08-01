"use client";

import CourseModulesPage from "@/components/admin/CourseModulesPage";
import { use } from "react";

export default function InstructorCourseModulesRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CourseModulesPage courseId={id} />;
}
