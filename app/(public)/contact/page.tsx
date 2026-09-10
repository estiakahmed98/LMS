import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, GraduationCap, Mail, MapPin, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/public/ContactForm";
import { MarketingFooter } from "@/components/public/MarketingFooter";
import { MarketingNav } from "@/components/public/MarketingNav";
import { RevealWrapper } from "@/components/public/RevealWrapper";

export const metadata: Metadata = {
  title: "Contact | BOED LMS",
  description: "Contact the BOED LMS team for course, enrollment, support, or institutional enquiries.",
};

const contactOptions = [
  { icon: Mail, title: "Email us", detail: "mailer@boed.org", href: "mailto:mailer@boed.org" },
  { icon: MapPin, title: "Our location", detail: "Dhaka, Bangladesh" },
  { icon: Clock3, title: "Response time", detail: "Within 1–2 business days" },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <MarketingNav />
      <main>
        <section className="relative isolate overflow-hidden px-6 pb-20 pt-40 sm:pb-28 sm:pt-48">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_42%)]" />
          <div className="absolute left-1/2 top-20 -z-10 size-[30rem] -translate-x-1/2 rounded-full border border-primary/10" />
          <RevealWrapper className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
              <MessageCircle className="size-3.5" /> Contact us
            </span>
            <h1 className="mt-6 text-balance text-5xl font-bold tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">Let&apos;s start a <span className="text-primary">conversation.</span></h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">Questions about a course, enrollment, or bringing BOED LMS to your institution? Tell us what you need and we&apos;ll point you in the right direction.</p>
          </RevealWrapper>
        </section>

        <section className="px-6 pb-24 sm:pb-32">
          <div className="mx-auto grid max-w-[90vw] gap-8 lg:grid-cols-[.75fr_1.25fr] lg:gap-12">
            <RevealWrapper className="space-y-5">
              {contactOptions.map(({ icon: Icon, title, detail, href }) => {
                const content = <><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-5" /></span><span><span className="block text-sm text-muted-foreground">{title}</span><span className="mt-1 block font-semibold text-foreground">{detail}</span></span></>;
                return href ? <a key={title} href={href} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">{content}</a> : <div key={title} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">{content}</div>;
              })}
              <div className="rounded-[2rem] bg-foreground p-7 text-background">
                <GraduationCap className="size-8 text-primary" />
                <h2 className="mt-5 text-2xl font-bold">Looking for a course?</h2>
                <p className="mt-3 leading-7 text-background/70">Browse the catalog to explore currently available learning programs.</p>
                <Link href="/enroll" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">View course catalog <ArrowRight className="size-4" /></Link>
              </div>
            </RevealWrapper>
            <RevealWrapper delay={0.1}>
              <div className="mb-6">
                <p className="text-sm font-semibold tracking-widest text-primary uppercase">Send a message</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">How can we help?</h2>
              </div>
              <ContactForm />
            </RevealWrapper>
          </div>
        </section>

        <section className="border-t border-border bg-card px-6 py-20">
          <RevealWrapper className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-7 text-center md:flex-row md:text-left">
            <div className="flex items-center gap-5"><span className="hidden size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex"><BookOpen className="size-6" /></span><div><h2 className="text-2xl font-bold text-foreground">Already enrolled?</h2><p className="mt-1 text-muted-foreground">Sign in to access your courses and learning dashboard.</p></div></div>
            <Link href="/login" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">Go to login <ArrowRight className="size-4" /></Link>
          </RevealWrapper>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
