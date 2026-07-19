"use client";

import { motion } from "framer-motion";
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

export function HowItWorks() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[90vw] px-6">
        <SectionHeading
          eyebrow="Getting Started"
          title="Up and running in three steps"
        />

        <div className="relative mt-16">
          <svg
            className="absolute top-10 left-0 hidden w-full md:block"
            height="4"
            viewBox="0 0 100 1"
            preserveAspectRatio="none"
          >
            <motion.line
              x1="10"
              y1="0.5"
              x2="90"
              y2="0.5"
              stroke="var(--color-border)"
              strokeWidth="2"
              strokeDasharray="0.5 3"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </svg>

          <RevealStagger className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {steps.map((step, i) => (
              <RevealItem key={step.title} className="relative text-center">
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card shadow-lg shadow-black/5">
                  <step.icon className="h-8 w-8 text-primary" />
                  <span className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                </div>
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
    </section>
  );
}
