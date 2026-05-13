"use client";

import dynamic from "next/dynamic";
import { Sparkles, Globe } from "lucide-react";
import { Spotlight } from "@/components/ui/primitives/spotlight";
import { GridBackground } from "@/components/ui/primitives/grid-background";
import { MagneticButton } from "@/components/ui/primitives/magnetic-button";

const HeroForceField = dynamic(
  () =>
    import("@/components/landing/force-field-background").then(
      (mod) => mod.ForceFieldBackground,
    ),
  { ssr: false },
);

/**
 * Landing hero — unchanged layout/visuals from the marketing home page.
 */
export function HeroSection() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden px-6">
      <div className="absolute inset-0 z-0 min-h-[100svh]">
        <HeroForceField
          hue={206}
          saturation={44}
          spacing={12}
          forceStrength={12}
          magnifierRadius={168}
          minStroke={1.25}
          maxStroke={4.5}
          className="min-h-[100svh] opacity-[0.92]"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[hsl(var(--color-bg))/0.88] via-[hsl(var(--color-bg))/0.45] to-[hsl(var(--color-bg))/0.82]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-[2]">
        <Spotlight className="right-0 top-0" />
        <GridBackground opacity={0.2} />
      </div>
      <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center py-20 md:py-28">
        <div className="flex w-full max-w-3xl flex-col items-center space-y-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--color-border-strong))] px-4 py-1 text-xs text-[hsl(var(--color-text-secondary))]">
            <Sparkles className="size-3.5" /> Open source · MIT
          </div>
          <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-[hsl(var(--color-text-primary))] md:text-7xl">
            Build RAG apps with DeepSeek
            <br />
            in{" "}
            <span className="bg-gradient-to-r from-[hsl(var(--color-accent))] to-[hsl(var(--color-text-primary))] bg-clip-text text-transparent">
              minutes
            </span>
            , not months.
          </h1>
          <p className="max-w-2xl text-lg text-[hsl(var(--color-text-secondary))]">
            Document upload, embeddings, semantic search, streaming citations —
            done right. No LangChain bloat.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <MagneticButton href="/login?next=/chat" variant="primary">
              Sign in to try the app
            </MagneticButton>
            <MagneticButton href="https://github.com" variant="secondary">
              <Globe className="mr-2 size-4" /> View on GitHub ↗
            </MagneticButton>
          </div>
          <p className="text-sm text-[hsl(var(--color-text-tertiary))]">
            Email sign-in required · Supabase Auth + RLS
          </p>
        </div>
      </div>
    </section>
  );
}
