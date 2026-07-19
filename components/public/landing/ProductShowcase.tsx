"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { LayoutDashboard, GraduationCap, Users } from "lucide-react";
import { SectionHeading } from "../SectionHeading";

const roles = [
  {
    key: "admin",
    icon: LayoutDashboard,
    title: "For Administrators",
    description:
      "Manage institutions, courses, instructors, and learners from a single control center. Monitor enrollment, results, and platform-wide analytics in real time.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    key: "instructor",
    icon: Users,
    title: "For Instructors",
    description:
      "Build courses, run live classes, create question banks, and grade assessments — with tools designed for how teaching actually works.",
    accent: "from-secondary/30 to-secondary/5",
  },
  {
    key: "learner",
    icon: GraduationCap,
    title: "For Learners",
    description:
      "Track progress, join live classes, sit assessments, and download verified certificates — all from one dashboard.",
    accent: "from-primary/20 to-primary/5",
  },
];

export function ProductShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const index = Math.min(roles.length - 1, Math.floor(latest * roles.length));
    setActive(index);
  });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 8;
      const y = (e.clientY / window.innerHeight - 0.5) * -8;
      setTilt({ x, y });
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const role = roles[active];

  return (
    <section id="showcase" ref={containerRef} className="relative" style={{ height: `${roles.length * 100}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden py-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Product Tour"
              title="One platform, built for every role"
              description="Scroll to see how each dashboard adapts to what people actually need to get done."
            />

            <div className="mt-10 space-y-3">
              {roles.map((r, i) => (
                <div
                  key={r.key}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300 ${
                    i === active
                      ? "border-primary/30 bg-primary/5"
                      : "border-transparent opacity-40"
                  }`}
                >
                  <r.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{r.title}</span>
                </div>
              ))}
            </div>

            <motion.div
              key={role.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-6 max-w-md text-sm text-muted-foreground"
            >
              {role.description}
            </motion.div>
          </div>

          <div
            className="relative mx-auto aspect-16/10 w-full max-w-lg [perspective:1200px]"
          >
            <motion.div
              animate={{ rotateX: tilt.y, rotateY: tilt.x }}
              transition={{ type: "spring", stiffness: 80, damping: 14 }}
              className="relative h-full w-full rounded-2xl border border-border bg-card p-3 shadow-2xl shadow-black/10 [transform-style:preserve-3d]"
            >
              <div className="flex items-center gap-1.5 px-2 pb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-secondary/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
              </div>
              <motion.div
                key={role.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className={`relative flex h-[calc(100%-1.75rem)] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${role.accent}`}
              >
                <role.icon className="h-20 w-20 text-primary/40" />
                <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-xs font-medium text-foreground backdrop-blur">
                  {role.title} Dashboard Preview
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
