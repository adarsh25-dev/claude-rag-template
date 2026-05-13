"use client";

import { useLayoutEffect } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HeroSection } from "@/src/sections/HeroSection";
import { PipelineSection } from "@/src/sections/PipelineSection";
import { FeaturesSection } from "@/src/sections/FeaturesSection";
import { TransformationSection } from "@/src/sections/TransformationSection";
import { VelocityMarquee } from "@/src/sections/VelocityMarquee";
import { PlaygroundPreview } from "@/src/sections/PlaygroundPreview";
import { MetricsSection } from "@/src/sections/MetricsSection";
import { TestimonialsSection } from "@/src/sections/TestimonialsSection";
import { Footer } from "@/src/sections/Footer";
import { ScrollToTop } from "@/src/components/ScrollToTop";

gsap.registerPlugin(ScrollTrigger);

const FinalCTASection = dynamic(
  () =>
    import("@/src/sections/FinalCTASection").then((mod) => ({
      default: mod.default,
    })),
  { ssr: false, loading: () => null },
);

/**
 * Landing page composition: hero + scroll-driven sections + footer.
 * 3D-friendly stage uses a shared perspective wrapper below the hero.
 */
export default function App() {
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    const t1 = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    const t2 = window.setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <>
      <HeroSection />

      <div className="relative isolate bg-[hsl(var(--color-bg))]">
        <PipelineSection />
        <FeaturesSection />
        <TransformationSection />
        <VelocityMarquee />
        <PlaygroundPreview />
        <MetricsSection />
        <TestimonialsSection />
        <FinalCTASection />
        <Footer />
      </div>

      <ScrollToTop />
    </>
  );
}
