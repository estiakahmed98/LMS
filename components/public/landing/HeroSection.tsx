"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { useState } from "react";
import { GradientButton } from "../GradientButton";
import { HeroSceneLoader } from "../HeroSceneLoader";
import { DemoVideoModal } from "./DemoVideoModal";

const words = ["Complete", "Learning", "Management", "Platform"];

const logos = [
  "Government Training Institutes",
  "Polytechnic Colleges",
  "Vocational Academies",
  "Skill Development Centers",
  "Board of Education Partners",
];

export function HeroSection() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <section className="relative overflow-hidden pt-36 pb-20 sm:pt-44 sm:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_60%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_60%,transparent)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase"
          >
            For Institutions &amp; Training Centers
          </motion.span>

          <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {words.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1 * i,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`mr-3 inline-block ${
                  word === "Management"
                    ? "bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
                    : ""
                }`}
              >
                {word}
              </motion.span>
            ))}
            <br />
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-block"
            >
              for Modern Institutions
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-6 max-w-lg text-pretty text-base text-muted-foreground sm:text-lg"
          >
            BOED LMS brings course management, live classes, assessments, and
            results into one platform — built for training centers and
            educational institutions that need to run at scale.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <GradientButton href="/enroll">Request a Demo</GradientButton>
            <button
              onClick={() => setVideoOpen(true)}
              className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card transition-colors group-hover:border-primary group-hover:text-primary">
                <Play className="h-4 w-4 fill-current" />
              </span>
              Watch Overview
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="mt-14"
          >
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Trusted by institutions across the country
            </p>
            <div className="relative mt-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
              <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-10 hover:[animation-play-state:paused]">
                {[...logos, ...logos].map((name, i) => (
                  <span
                    key={i}
                    className="shrink-0 text-sm font-semibold whitespace-nowrap text-muted-foreground/70"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative h-[420px] w-full lg:h-[520px]">
          <HeroSceneLoader />
        </div>
      </div>

      <DemoVideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
