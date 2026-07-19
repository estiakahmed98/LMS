"use client";

import { Star } from "lucide-react";
import { SectionHeading } from "../SectionHeading";

const testimonials = [
  {
    quote:
      "BOED LMS let us digitize our entire training program in weeks, not months. Attendance and grading that used to take days now takes minutes.",
    name: "Rafiqul Islam",
    role: "Principal, Regional Polytechnic Institute",
  },
  {
    quote:
      "The role-based dashboards mean our instructors and admins finally see exactly what they need — nothing more, nothing less.",
    name: "Nusrat Jahan",
    role: "Academic Coordinator, Skill Development Center",
  },
  {
    quote:
      "Live classes, assessments, and certificates in one system removed three separate tools we used to juggle.",
    name: "Kamal Hossain",
    role: "Director, Vocational Training Academy",
  },
  {
    quote:
      "Setup was straightforward and support was responsive throughout our institution-wide rollout.",
    name: "Farhana Akter",
    role: "IT Head, Technical Training Board",
  },
];

function Row({
  items,
  reverse,
}: {
  items: typeof testimonials;
  reverse?: boolean;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className={`flex w-max gap-6 ${
          reverse
            ? "animate-[marquee-reverse_40s_linear_infinite]"
            : "animate-[marquee_40s_linear_infinite]"
        } hover:[animation-play-state:paused]`}
      >
        {doubled.map((t, i) => (
          <div
            key={i}
            className="w-80 shrink-0 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex gap-0.5 text-primary">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <p className="mt-3 text-sm text-foreground/90">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {t.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t.name}
                </p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Testimonials"
          title="Trusted by institutions like yours"
          description="Hear from administrators and instructors already running BOED LMS."
        />
      </div>

      <div className="mt-14 space-y-6">
        <Row items={testimonials} />
        <Row items={testimonials} reverse />
      </div>

      <style>{`
        @keyframes marquee-reverse {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
