import { Check } from "lucide-react";
import { SectionHeading } from "../SectionHeading";
import { RevealItem, RevealStagger } from "../RevealWrapper";
import { GradientButton } from "../GradientButton";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    description: "For single institutions getting started with digital learning.",
    features: ["Up to 500 learners", "Course & assessment management", "Basic reporting", "Email support"],
    cta: "Request a Quote",
    highlighted: false,
  },
  {
    name: "Institution",
    description: "For growing institutions running live and self-paced learning.",
    features: [
      "Unlimited learners",
      "Live classes & attendance",
      "Question bank & CQ/MCQ exams",
      "Certificates & verification",
      "Priority support",
    ],
    cta: "Request a Quote",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "For education boards and multi-institution deployments.",
    features: [
      "Multi-institution management",
      "Custom branding & domains",
      "Advanced analytics",
      "Dedicated onboarding",
      "SLA-backed support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export function PricingTeaser() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Plans that scale with your institution"
          description="Every plan is tailored to institution size and needs — get a custom quote for your deployment."
        />

        <RevealStagger className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <RevealItem
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-3xl border p-8",
                plan.highlighted
                  ? "border-primary/30 bg-card shadow-2xl shadow-primary/10 lg:scale-105"
                  : "border-border bg-card",
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <GradientButton
                href="/contact"
                variant={plan.highlighted ? "primary" : "outline"}
                className="mt-8 w-full"
              >
                {plan.cta}
              </GradientButton>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
