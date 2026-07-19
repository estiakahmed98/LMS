import { RevealWrapper } from "../RevealWrapper";
import { GradientButton } from "../GradientButton";

export function FinalCTA() {
  return (
    <section className="px-6 py-24">
      <RevealWrapper className="relative mx-auto max-w-[90vw] overflow-hidden rounded-[2.5rem] bg-[#0B1120] px-8 py-16 text-center sm:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklab,var(--color-primary)_35%,transparent),transparent_50%),radial-gradient(circle_at_80%_80%,color-mix(in_oklab,var(--color-primary)_25%,transparent),transparent_50%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]"
        />

        <div className="relative">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ready to transform your institution?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-white/70">
            See BOED LMS in action with a personalized walkthrough for your
            institution&apos;s needs.
          </p>
          <div className="mt-8 flex justify-center">
            <GradientButton href="/enroll">Request a Demo</GradientButton>
          </div>
        </div>
      </RevealWrapper>
    </section>
  );
}
