import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export function LegalPage({ title, description, updated, sections }: { title: string; description: string; updated: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main>
        <header className="relative overflow-hidden border-b border-border px-6 pb-20 pt-40 sm:pt-48">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_15%,transparent),transparent_45%)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase"><FileText className="size-3.5" /> Legal</span>
            <h1 className="mt-6 text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl">{title}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{description}</p>
            <p className="mt-5 text-sm font-medium text-muted-foreground">Last updated: {updated}</p>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[220px_1fr] lg:py-24">
          <aside className="hidden lg:block">
            <nav aria-label={`${title} sections`} className="sticky top-28 rounded-2xl border border-border bg-card p-4">
              <p className="px-2 pb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">On this page</p>
              <ol className="space-y-1">
                {sections.map((section, index) => <li key={section.title}><a href={`#section-${index + 1}`} className="block rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{section.title}</a></li>)}
              </ol>
            </nav>
          </aside>
          <article className="min-w-0 rounded-[2rem] border border-border bg-card px-6 py-4 shadow-sm sm:px-10">
            {sections.map((section, index) => (
              <section id={`section-${index + 1}`} key={section.title} className="scroll-mt-32 border-b border-border py-9 last:border-0">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{index + 1}. {section.title}</h2>
                {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-4 leading-8 text-muted-foreground">{paragraph}</p>)}
                {section.items && <ul className="mt-4 space-y-3 pl-5 text-muted-foreground">{section.items.map((item) => <li key={item} className="list-disc leading-7 marker:text-primary">{item}</li>)}</ul>}
              </section>
            ))}
          </article>
        </div>

        <div className="border-t border-border bg-card px-6 py-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" /> Back to home</Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
