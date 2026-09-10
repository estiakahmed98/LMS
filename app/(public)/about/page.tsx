import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  GraduationCap,
  HeartHandshake,
  Layers3,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { MarketingFooter } from "@/components/public/MarketingFooter";
import { MarketingNav } from "@/components/public/MarketingNav";
import { RevealItem, RevealStagger, RevealWrapper } from "@/components/public/RevealWrapper";

export const metadata: Metadata = {
  title: "About BOED LMS",
  description: "Learn how BOED LMS helps institutions deliver structured, accessible, and measurable learning experiences.",
};

const values = [
  { icon: Target, title: "Purposeful learning", description: "Every course, assessment, and report is designed to move learners toward a clear outcome." },
  { icon: Users, title: "People first", description: "Simple workflows help learners focus on growth and instructors focus on teaching." },
  { icon: ShieldCheck, title: "Built on trust", description: "Clear roles, dependable records, and transparent results keep every stakeholder aligned." },
  { icon: Sparkles, title: "Always improving", description: "We keep the platform practical, responsive, and ready for the changing needs of modern training." },
];

const capabilities = [
  "Create and organize courses in one place",
  "Run live classes and keep recordings accessible",
  "Build assessments and manage grading workflows",
  "Track progress, results, and certifications",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <MarketingNav />
      <main>
        <section className="relative isolate flex min-h-[720px] items-center overflow-hidden px-6 pb-20 pt-36 sm:min-h-[760px] sm:pt-40">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_30%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_34%),radial-gradient(circle_at_12%_80%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_28%)]" />
          <div className="absolute left-1/2 top-28 -z-10 size-72 -translate-x-1/2 rounded-full border border-primary/10 sm:size-[32rem]" />
          <div className="absolute left-1/2 top-36 -z-10 size-56 -translate-x-1/2 rounded-full border border-primary/10 sm:size-[28rem]" />
          <div className="mx-auto grid w-full max-w-[90vw] items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
            <RevealWrapper>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
                <HeartHandshake className="size-3.5" /> About BOED LMS
              </span>
              <h1 className="mt-6 max-w-4xl text-balance text-5xl font-bold tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">
                Learning that turns knowledge into <span className="text-primary">real progress.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
                BOED LMS brings courses, live learning, assessments, and results into one focused platform—so institutions can teach better and learners can move forward with confidence.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/enroll" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">
                  Explore courses <ArrowRight className="size-4" />
                </Link>
                <Link href="/#features" className="inline-flex items-center justify-center rounded-full border border-border bg-background/60 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-muted">
                  See the platform
                </Link>
              </div>
            </RevealWrapper>
            <RevealWrapper delay={0.15} className="relative mx-auto w-full max-w-xl">
              <div className="relative aspect-square rounded-[2.5rem] border border-border/80 bg-card p-5 shadow-2xl shadow-primary/10 sm:p-8">
                <div className="absolute inset-5 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-primary/5" />
                <div className="relative flex h-full flex-col justify-between rounded-[1.75rem] border border-primary/15 bg-background/80 p-6 backdrop-blur sm:p-9">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"><GraduationCap className="size-7" /></div>
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">One connected platform</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">Our focus</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Make every learning journey clear, connected, and measurable.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[BookOpenCheck, Layers3, Users].map((Icon, index) => (
                      <div key={index} className="flex aspect-square items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-sm"><Icon className="size-6 sm:size-7" /></div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealWrapper>
          </div>
        </section>

        <section className="border-y border-border bg-card px-6 py-24 sm:py-32">
          <div className="mx-auto grid max-w-[90vw] gap-14 lg:grid-cols-2 lg:items-center lg:gap-24">
            <RevealWrapper className="relative mx-auto w-full max-w-xl lg:mx-0">
              <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-primary/8 blur-2xl" />
              <div className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-xl shadow-black/5">
                <Image src="/boedl4.jpg" alt="Birds of Eden, the identity behind BOED" width={3000} height={3000} className="aspect-[4/3] w-full object-contain p-5 sm:p-8" />
              </div>
            </RevealWrapper>
            <RevealWrapper delay={0.1}>
              <span className="text-sm font-semibold tracking-widest text-primary uppercase">Our story</span>
              <h2 className="mt-4 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">A better home for professional learning</h2>
              <div className="mt-6 space-y-5 text-base leading-8 text-muted-foreground sm:text-lg">
                <p>BOED LMS was created to remove the friction that often sits between great teaching and meaningful learner outcomes.</p>
                <p>Instead of splitting the learning experience across disconnected tools, the platform gives institutions one organized space for content, classes, assessment, feedback, and achievement.</p>
                <p>The result is a calmer experience for administrators, more time for instructors, and a clearer path forward for every learner.</p>
              </div>
            </RevealWrapper>
          </div>
        </section>

        <section className="px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-[90vw]">
            <RevealWrapper className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-semibold tracking-widest text-primary uppercase">What guides us</span>
              <h2 className="mt-4 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Designed around the people who learn and teach</h2>
              <p className="mt-5 text-lg text-muted-foreground">Our principles shape every workflow, screen, and learning experience.</p>
            </RevealWrapper>
            <RevealStagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map(({ icon: Icon, title, description }) => (
                <RevealItem key={title} className="h-full">
                  <article className="group h-full rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110"><Icon className="size-5" /></div>
                    <h3 className="mt-6 text-xl font-semibold text-foreground">{title}</h3>
                    <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
                  </article>
                </RevealItem>
              ))}
            </RevealStagger>
          </div>
        </section>

        <section className="px-6 pb-24 sm:pb-32">
          <RevealWrapper className="mx-auto max-w-[90vw] overflow-hidden rounded-[2rem] bg-foreground text-background">
            <div className="grid gap-12 px-7 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1fr_.9fr] lg:items-center lg:px-16">
              <div>
                <span className="text-sm font-semibold tracking-widest text-primary uppercase">One learning ecosystem</span>
                <h2 className="mt-4 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-5xl">Everything your learning community needs to keep moving.</h2>
              </div>
              <ul className="space-y-4">
                {capabilities.map((capability) => (
                  <li key={capability} className="flex items-start gap-3 text-background/75"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /><span>{capability}</span></li>
                ))}
              </ul>
            </div>
          </RevealWrapper>
        </section>

        <section className="border-t border-border bg-card px-6 py-24 text-center sm:py-28">
          <RevealWrapper className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold tracking-widest text-primary uppercase">Start learning</p>
            <h2 className="mt-4 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Ready to take the next step?</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">Explore available courses and find the learning path that fits your goals.</p>
            <Link href="/enroll" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">Browse course catalog <ArrowRight className="size-4" /></Link>
          </RevealWrapper>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
