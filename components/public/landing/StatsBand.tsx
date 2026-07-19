"use client";

import CountUp from "react-countup";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { RevealItem, RevealStagger } from "../RevealWrapper";

const stats = [
  { value: 12000, suffix: "+", label: "Learners Managed" },
  { value: 340, suffix: "+", label: "Courses Delivered" },
  { value: 65, suffix: "+", label: "Institutions Onboarded" },
  { value: 99.9, suffix: "%", decimals: 1, label: "Platform Uptime" },
];

export function StatsBand() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative overflow-hidden bg-[#0B1120] py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]"
      />
      <RevealStagger className="relative mx-auto grid max-w-[90vw] grid-cols-2 gap-8 px-6 lg:grid-cols-4">
        <div ref={ref} className="contents">
          {stats.map((stat) => (
            <RevealItem key={stat.label} className="text-center">
              <div className="text-4xl font-bold text-white sm:text-5xl">
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
              </div>
              <p className="mt-2 text-sm font-medium text-white/60">
                {stat.label}
              </p>
            </RevealItem>
          ))}
        </div>
      </RevealStagger>
    </section>
  );
}
