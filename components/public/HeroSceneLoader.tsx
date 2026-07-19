"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => null,
});

function StaticHeroFallback() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="absolute h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className="h-24 w-40 -translate-x-6 rotate-[-4deg] rounded-2xl border border-border bg-card shadow-xl shadow-black/10" />
        <div className="h-28 w-32 translate-x-16 -translate-y-8 rotate-[6deg] rounded-2xl bg-primary shadow-xl shadow-primary/30" />
        <div className="h-16 w-24 translate-x-2 translate-y-2 rotate-[-2deg] rounded-2xl border border-border bg-card shadow-lg" />
      </div>
    </div>
  );
}

export function HeroSceneLoader() {
  const [canRender3D, setCanRender3D] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    const lowEndDevice = typeof deviceMemory === "number" && deviceMemory <= 4;
    const isSmallScreen = window.matchMedia("(max-width: 767px)").matches;

    setCanRender3D(!prefersReducedMotion && !lowEndDevice && !isSmallScreen);
  }, []);

  if (!canRender3D) {
    return <StaticHeroFallback />;
  }

  return (
    <div className="h-full w-full">
      <HeroScene />
    </div>
  );
}
