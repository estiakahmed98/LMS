"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { SectionHeading } from "../SectionHeading";
import { RevealItem, RevealStagger } from "../RevealWrapper";

const faqs = [
  {
    q: "Is our institution's data secure?",
    a: "Yes. BOED LMS uses role-based access control, encrypted authentication, and isolated data per institution to keep your records secure.",
  },
  {
    q: "Where is the platform hosted?",
    a: "BOED LMS runs on cloud infrastructure with regular backups and monitoring. On-premise deployment is available for enterprise agreements.",
  },
  {
    q: "Does the platform support Bangla?",
    a: "Yes. The platform supports multiple languages including Bangla, with locale-aware fonts and layouts throughout.",
  },
  {
    q: "How long does onboarding take?",
    a: "Most institutions are fully onboarded within one to two weeks, including course setup, user imports, and staff training.",
  },
  {
    q: "Can we customize the platform for our institution?",
    a: "Branding, course structures, and grading workflows can be tailored to your institution's requirements on Institution and Enterprise plans.",
  },
  {
    q: "What kind of support is included?",
    a: "All plans include email support, with priority and dedicated support available on higher tiers.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <RevealItem className="rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-sm font-semibold text-foreground sm:text-base">
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Plus className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </RevealItem>
  );
}

export function FAQ() {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-[90vw] px-6">
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />

        <RevealStagger className="mt-12 space-y-4">
          {faqs.map((f) => (
            <FaqItem key={f.q} {...f} />
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
