import type { Metadata } from "next";
import { Award, LockKeyhole, SearchCheck } from "lucide-react";
import { MarketingFooter } from "@/components/public/MarketingFooter";
import { MarketingNav } from "@/components/public/MarketingNav";
import { RevealWrapper } from "@/components/public/RevealWrapper";
import { VerifyCertificateForm } from "@/components/public/VerifyCertificateForm";

export const metadata: Metadata = { title: "Verify Certificate | BOED LMS", description: "Check the authenticity and current status of a certificate issued through BOED LMS." };

export default function VerifyPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <MarketingNav />
      <main>
        <section className="relative isolate overflow-hidden px-6 pb-16 pt-40 text-center sm:pb-20 sm:pt-48">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_20%,transparent),transparent_42%)]" />
          <div className="absolute left-1/2 top-24 -z-10 size-80 -translate-x-1/2 rounded-full border border-primary/10 sm:size-[32rem]" />
          <RevealWrapper className="mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase"><Award className="size-3.5" /> Credential verification</span>
            <h1 className="mt-6 text-balance text-5xl font-bold tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">Verify a BOED <span className="text-primary">certificate.</span></h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">Confirm a learner&apos;s achievement and check the certificate&apos;s current status in seconds.</p>
          </RevealWrapper>
        </section>

        <section className="px-6 pb-24 sm:pb-32"><RevealWrapper><VerifyCertificateForm /></RevealWrapper></section>

        <section className="border-t border-border bg-card px-6 py-20">
          <RevealWrapper className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-background p-7"><SearchCheck className="size-7 text-primary" /><h2 className="mt-5 text-xl font-bold text-foreground">Instant status check</h2><p className="mt-2 leading-7 text-muted-foreground">See whether a certificate exists and whether it is currently valid or revoked.</p></div>
            <div className="rounded-3xl border border-border bg-background p-7"><LockKeyhole className="size-7 text-primary" /><h2 className="mt-5 text-xl font-bold text-foreground">Privacy conscious</h2><p className="mt-2 leading-7 text-muted-foreground">Only limited credential details are returned. Account and contact information remain private.</p></div>
          </RevealWrapper>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
