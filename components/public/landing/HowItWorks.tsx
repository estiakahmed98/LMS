"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Building2, Users2, GraduationCap } from "lucide-react";
import { SectionHeading } from "../SectionHeading";
import { RevealItem, RevealStagger } from "../RevealWrapper";

const steps = [
  {
    icon: Building2,
    title: "Onboard Your Institution",
    description:
      "Set up your institution profile, branding, and administrative structure in minutes.",
  },
  {
    icon: Users2,
    title: "Set Up Courses & Users",
    description:
      "Create courses, invite instructors, and enroll learners with role-based access.",
  },
  {
    icon: GraduationCap,
    title: "Teach, Track, and Grow",
    description:
      "Deliver live and self-paced learning, assess progress, and act on real analytics.",
  },
];

function SegmentLine({
  index,
  total,
  scrollYProgress,
}: {
  index: number;
  total: number;
  scrollYProgress: MotionValue<number>;
}) {
  const scaleX = useTransform(
    scrollYProgress,
    [index / total, (index + 1) / total],
    [0, 1]
  );

  return (
    <div className="pointer-events-none absolute top-10 left-[calc(50%+2.5rem)] z-0 hidden h-0.5 w-[calc(100%-5rem+2.5rem)] -translate-y-1/2 md:block">
      <div className="absolute inset-0 border-t-2 border-dashed border-border" />
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="h-full origin-left bg-primary"
          style={{ scaleX }}
        />
      </div>
    </div>
  );
}

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const index = Math.min(
      steps.length - 1,
      Math.floor(latest * steps.length)
    );
    setActive(latest <= 0 ? -1 : index);
  });

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: `${steps.length * 100}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden py-24">
        <div className="mx-auto w-full max-w-[90vw] px-6">
          <SectionHeading
            eyebrow="Getting Started"
            title="Up and running in three steps"
          />

          <div className="relative mt-16">
            <RevealStagger className="relative z-10 grid grid-cols-1 gap-10 md:grid-cols-3">
              {steps.map((step, i) => (
                <RevealItem key={step.title} className="relative text-center">
                  {i < steps.length - 1 && (
                    <SegmentLine
                      index={i}
                      total={steps.length}
                      scrollYProgress={scrollYProgress}
                    />
                  )}
                  <motion.div
                    animate={{ scale: i === active ? 1.08 : 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className={`relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border bg-card shadow-lg transition-colors duration-300 ${
                      i <= active
                        ? "border-primary/50 bg-primary/10 shadow-primary/20"
                        : "border-border shadow-black/5"
                    }`}
                  >
                    <step.icon
                      className={`h-8 w-8 transition-colors duration-300 ${
                        i <= active ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-4 ring-background transition-colors duration-300 ${
                        i <= active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </motion.div>
                  <h3 className="mt-6 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </RevealItem>
              ))}
            </RevealStagger>
          </div>
        </div>
      </div>
    </section>
  );
}
