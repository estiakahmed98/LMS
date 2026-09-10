"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Send } from "lucide-react";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const organization = String(form.get("organization") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const subject = encodeURIComponent(`BOED LMS enquiry from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nOrganization: ${organization || "Not provided"}\n\n${message}`,
    );

    setSent(true);
    window.location.href = `mailto:mailer@boed.org?subject=${subject}&body=${body}`;
  }

  if (sent) {
    return (
      <div className="flex min-h-[430px] flex-col items-center justify-center rounded-[2rem] border border-primary/20 bg-primary/5 p-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <CheckCircle2 className="size-8" />
        </span>
        <h2 className="mt-6 text-2xl font-bold text-foreground">Your email is ready</h2>
        <p className="mt-3 max-w-sm leading-7 text-muted-foreground">
          Your email app should open with the message filled in. Send it from there and our team will get back to you.
        </p>
        <button type="button" onClick={() => setSent(false)} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          Write another message <ArrowRight className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-black/5 sm:p-9">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-foreground">
          <span>Name</span>
          <input name="name" required autoComplete="name" placeholder="Your name" className="h-12 w-full rounded-xl border border-border bg-background px-4 font-normal outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/10" />
        </label>
        <label className="space-y-2 text-sm font-medium text-foreground">
          <span>Email</span>
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="h-12 w-full rounded-xl border border-border bg-background px-4 font-normal outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/10" />
        </label>
      </div>
      <label className="mt-5 block space-y-2 text-sm font-medium text-foreground">
        <span>Organization <span className="font-normal text-muted-foreground">(optional)</span></span>
        <input name="organization" autoComplete="organization" placeholder="Organization or institution" className="h-12 w-full rounded-xl border border-border bg-background px-4 font-normal outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/10" />
      </label>
      <label className="mt-5 block space-y-2 text-sm font-medium text-foreground">
        <span>How can we help?</span>
        <textarea name="message" required rows={6} placeholder="Tell us what you would like to know..." className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 font-normal outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/10" />
      </label>
      <button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 sm:w-auto">
        Send message <Send className="size-4" />
      </button>
    </form>
  );
}
