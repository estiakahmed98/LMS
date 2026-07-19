"use client";

import CountUp from "react-countup";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Users, BookOpen, Building2, ShieldCheck } from "lucide-react";
import { RevealItem, RevealStagger } from "../RevealWrapper";

const stats = [
  {
    icon: Users,
    value: 12000,
    suffix: "+",
    label: "Learners Managed",
    accent: "text-primary",
  },
  {
    icon: BookOpen,
    value: 340,
    suffix: "+",
    label: "Courses Delivered",
    accent: "text-secondary",
  },
  {
    icon: Building2,
    value: 65,
    suffix: "+",
    label: "Institutions Onboarded",
    accent: "text-primary",
  },
  {
    icon: ShieldCheck,
    value: 99.9,
    suffix: "%",
    decimals: 1,
    label: "Platform Uptime",
    accent: "text-secondary",
  },
];

export function StatsBand() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative overflow-hidden bg-[#0B1120] py-20 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-105 w-180 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"
      />

      <div ref={ref} className="relative mx-auto px-6">
        <RevealStagger className="grid grid-cols-2 divide-white/10 lg:grid-cols-4 lg:divide-x">
          {stats.map((stat) => (
            <RevealItem
              key={stat.label}
              className="group relative flex flex-col items-center justify-center gap-3 px-4 py-6 text-center"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${stat.accent} transition-colors duration-300 group-hover:border-white/20 group-hover:bg-white/10`}
              >
                <stat.icon className="h-5 w-5" />
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  {inView ? (
                    <CountUp
                      end={stat.value}
                      duration={2.2}
                      decimals={stat.decimals ?? 0}
                      suffix={stat.suffix}
                    />
                  ) : (
                    "0"
                  )}
                </span>
              </div>

              <p className="text-sm font-medium text-white/50">{stat.label}</p>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
