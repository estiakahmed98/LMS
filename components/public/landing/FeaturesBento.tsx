"use client";

import {
  BookOpen,
  Video,
  ClipboardCheck,
  Award,
  CalendarCheck,
  LayoutDashboard,
  Bell,
  BarChart3,
} from "lucide-react";
import { useRef, type MouseEvent } from "react";
import { SectionHeading } from "../SectionHeading";
import { RevealItem, RevealStagger } from "../RevealWrapper";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: BookOpen,
    title: "Course Management",
    description:
      "Build structured courses with modules, lessons, and rich content.",
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    icon: Video,
    title: "Live Classes",
    description: "Host real-time sessions with integrated video conferencing.",
  },
  {
    icon: ClipboardCheck,
    title: "Assessments & Grading",
    description:
      "MCQ and CQ exams with automated and manual grading workflows.",
  },
  {
    icon: Award,
    title: "Certificates",
    description: "Auto-generate and verify certificates on course completion.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance",
    description: "Track learner attendance across courses and live sessions.",
  },
  {
    icon: LayoutDashboard,
    title: "Role-Based Dashboards",
    description: "Purpose-built views for Admins, Instructors, and Learners.",
    span: "lg:col-span-2",
  },
  {
    icon: Bell,
    title: "Notices & Announcements",
    description: "Keep every institution in sync with a central notice board.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Performance insights across courses, cohorts, and results.",
  },
];

function BentoCard({
  icon: Icon,
  title,
  description,
  className,
}: (typeof features)[number] & { className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }

  return (
    <RevealItem
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5",
        className,
      )}
    >
      <div
        ref={cardRef}
        onMouseMove={onMouseMove}
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(240px circle at var(--x) var(--y), color-mix(in oklab, var(--color-primary) 12%, transparent), transparent 70%)",
        }}
      />
      <div className="relative">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </RevealItem>
  );
}

export function FeaturesBento() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-[90vw] px-6">
        <SectionHeading
          eyebrow="Platform"
          title="Everything your institution needs, in one place"
          description="From enrollment to certification, BOED LMS covers the full learning lifecycle."
        />

        <RevealStagger className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[180px]">
          {features.map((feature) => (
            <BentoCard key={feature.title} {...feature} />
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
