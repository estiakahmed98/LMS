import { MarketingNav } from "@/components/public/MarketingNav";
import { MarketingFooter } from "@/components/public/MarketingFooter";
import { HeroSection } from "@/components/public/landing/HeroSection";
import { StatsBand } from "@/components/public/landing/StatsBand";
import { FeaturesBento } from "@/components/public/landing/FeaturesBento";
import { ProductShowcase } from "@/components/public/landing/ProductShowcase";
import { HowItWorks } from "@/components/public/landing/HowItWorks";
import { Testimonials } from "@/components/public/landing/Testimonials";
import { PricingTeaser } from "@/components/public/landing/PricingTeaser";
import { FAQ } from "@/components/public/landing/FAQ";
import { FinalCTA } from "@/components/public/landing/FinalCTA";

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main>
        <HeroSection />
        <StatsBand />
        <FeaturesBento />
        <ProductShowcase />
        <HowItWorks />
        <Testimonials />
        <PricingTeaser />
        <FAQ />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
