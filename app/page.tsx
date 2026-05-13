import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Sparkles,
  Upload,
  Scissors,
  Database,
  Search,
  Globe,
  FileCode2,
  Rocket,
  FileText,
} from "lucide-react";
import { AuroraBackground } from "@/components/ui/primitives/aurora-background";
import { NoiseLayer } from "@/components/ui/primitives/noise-layer";
import { Spotlight } from "@/components/ui/primitives/spotlight";
import { GridBackground } from "@/components/ui/primitives/grid-background";
import { MagneticButton } from "@/components/ui/primitives/magnetic-button";
import { GlowCard } from "@/components/ui/primitives/glow-card";
import { BorderBeam } from "@/components/ui/primitives/border-beam";
import { RevealOnScroll } from "@/components/ui/primitives/reveal-on-scroll";
import { AnimatedNumber } from "@/components/ui/primitives/animated-number";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShimmerText } from "@/components/ui/primitives/shimmer-text";

const HeroForceField = dynamic(
  () =>
    import("@/components/landing/force-field-background").then(
      (mod) => mod.ForceFieldBackground,
    ),
  { ssr: false },
);

const steps = [
  { icon: Upload, title: "Upload", desc: "Drop PDFs, DOCX, MD, or TXT." },
  {
    icon: Scissors,
    title: "Parse + Chunk",
    desc: "Split into semantic chunks.",
  },
  {
    icon: Database,
    title: "Embed + Store",
    desc: "Generate vectors and persist.",
  },
  {
    icon: Search,
    title: "Retrieve + Generate",
    desc: "Answer with citations.",
  },
];

export default function HomePage() {
  return (
    <AuroraBackground className="relative min-h-screen">
      <NoiseLayer />
      <header className="sticky top-0 z-50 border-b border-transparent backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--color-bg))/0.45]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-sm font-semibold text-[hsl(var(--color-text-primary))]"
          >
            claude-rag-template
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[hsl(var(--color-text-secondary))] md:flex">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#demo">Demo</a>
            <a href="https://github.com" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden text-sm text-[hsl(var(--color-text-secondary))] hover:text-[hsl(var(--color-text-primary))] sm:inline"
            >
              Log in
            </Link>
            <MagneticButton href="/signup" variant="secondary" size="sm">
              Sign up
            </MagneticButton>
            <MagneticButton
              href="/login?next=/chat"
              variant="primary"
              size="sm"
            >
              Open app
            </MagneticButton>
          </div>
        </div>
      </header>

      <main>
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
                Document upload, embeddings, semantic search, streaming
                citations — done right. No LangChain bloat.
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

        <section id="how" className="mx-auto max-w-7xl px-6 py-24">
          <RevealOnScroll>
            <h2 className="font-display text-4xl text-[hsl(var(--color-text-primary))]">
              From document to answer in 4 steps.
            </h2>
          </RevealOnScroll>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {steps.map((step, i) => (
              <RevealOnScroll key={step.title} delay={i * 0.05}>
                <GlowCard className="relative rounded-2xl p-5">
                  {i < steps.length - 1 ? (
                    <BorderBeam className="opacity-35" />
                  ) : null}
                  <step.icon className="mb-3 size-5 text-[hsl(var(--color-accent))]" />
                  <h3 className="text-lg text-[hsl(var(--color-text-primary))]">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-[hsl(var(--color-text-secondary))]">
                    {step.desc}
                  </p>
                </GlowCard>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid gap-4 md:grid-cols-4">
            <GlowCard className="md:col-span-2 md:row-span-2 rounded-2xl p-6">
              <h3 className="text-xl text-[hsl(var(--color-text-primary))]">
                Streaming citations
              </h3>
              <p className="mt-2 text-sm text-[hsl(var(--color-text-secondary))]">
                Responses stream in with source references.
              </p>
            </GlowCard>
            <GlowCard className="rounded-2xl p-6">
              <FileText className="size-5 text-[hsl(var(--color-accent))]" />
              <p className="mt-3 text-sm">PDF, DOCX, MD, TXT</p>
            </GlowCard>
            <GlowCard className="rounded-2xl p-6">
              <Database className="size-5 text-[hsl(var(--color-accent))]" />
              <p className="mt-3 text-sm">pgvector + HNSW</p>
            </GlowCard>
            <GlowCard className="rounded-2xl p-6">
              <Sparkles className="size-5 text-[hsl(var(--color-accent))]" />
              <p className="mt-3 text-sm">DeepSeek V4 Pro</p>
            </GlowCard>
            <GlowCard className="md:col-span-2 rounded-2xl p-6">
              <FileCode2 className="size-5 text-[hsl(var(--color-accent))]" />
              <p className="mt-3 text-sm">RAG in 10 lines</p>
            </GlowCard>
            <GlowCard className="md:col-span-2 rounded-2xl p-6">
              <Rocket className="size-5 text-[hsl(var(--color-accent))]" />
              <p className="mt-3 text-sm">Deploy to Vercel</p>
            </GlowCard>
          </div>
        </section>

        <section id="demo" className="mx-auto max-w-7xl px-6 py-24">
          <h2 className="font-display text-4xl text-[hsl(var(--color-text-primary))]">
            RAG in 10 lines, no LangChain.
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <GlowCard className="rounded-2xl p-5">
              <ShimmerText className="text-sm">
                app/api/chat/route.ts
              </ShimmerText>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))] p-4 text-xs text-[hsl(var(--color-text-secondary))]">{`const chunks = await retrieveChunks(query)
const prompt = buildRAGPrompt(query, chunks)
return streamText({ model: nvidia('deepseek-v4-pro'), prompt })`}</pre>
            </GlowCard>
            <GlowCard className="rounded-2xl p-5">
              <p className="text-sm text-[hsl(var(--color-text-secondary))]">
                Without wrapper stack: 200+ lines, 4 deps
              </p>
              <p className="mt-3 text-lg text-[hsl(var(--color-text-primary))]">
                With this template: 10 lines, 0 wrapper libs
              </p>
            </GlowCard>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <GlowCard className="rounded-2xl p-6">
            <h3 className="text-xl text-[hsl(var(--color-text-primary))]">
              Live demo teaser
            </h3>
            <p className="mt-2 text-sm text-[hsl(var(--color-text-secondary))]">
              Sign in to upload documents, search the library, and chat with
              citations.
            </p>
            <Link
              href="/login?next=/chat"
              className="mt-4 inline-flex text-[hsl(var(--color-accent))]"
            >
              Sign in to open chat →
            </Link>
          </GlowCard>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-4 rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.7] p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <AnimatedNumber
                value={1024}
                className="text-2xl text-[hsl(var(--color-text-primary))]"
              />
              <p className="text-xs text-[hsl(var(--color-text-secondary))]">
                dim vectors
              </p>
            </div>
            <div>
              <AnimatedNumber
                value={50}
                className="text-2xl text-[hsl(var(--color-text-primary))]"
              />
              <p className="text-xs text-[hsl(var(--color-text-secondary))]">
                &lt;50ms retrieval
              </p>
            </div>
            <div>
              <AnimatedNumber
                value={0}
                className="text-2xl text-[hsl(var(--color-text-primary))]"
              />
              <p className="text-xs text-[hsl(var(--color-text-secondary))]">
                LangChain deps
              </p>
            </div>
            <div>
              <AnimatedNumber
                value={100}
                className="text-2xl text-[hsl(var(--color-text-primary))]"
              />
              <p className="text-xs text-[hsl(var(--color-text-secondary))]">
                % open source
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-24">
          <h2 className="font-display text-4xl text-[hsl(var(--color-text-primary))]">
            FAQ
          </h2>
          <Accordion className="mt-8 space-y-3">
            <AccordionItem
              value="q1"
              className="rounded-xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.7] px-4"
            >
              <AccordionTrigger>
                Does this include auth and citations?
              </AccordionTrigger>
              <AccordionContent>
                Yes. The template includes authenticated upload + chat with
                source citations.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="q2"
              className="rounded-xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.7] px-4"
            >
              <AccordionTrigger>Can I deploy it quickly?</AccordionTrigger>
              <AccordionContent>
                Yes. Add env vars and deploy to Vercel in minutes.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-24">
          <GlowCard className="rounded-2xl p-10 text-center">
            <h2 className="font-display text-4xl text-[hsl(var(--color-text-primary))]">
              Start building your RAG product today
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <MagneticButton href="/chat" variant="primary">
                Try the demo
              </MagneticButton>
              <MagneticButton href="https://github.com" variant="secondary">
                View on GitHub
              </MagneticButton>
            </div>
            <p className="mt-4 text-xs text-[hsl(var(--color-text-tertiary))]">
              GitHub stars badge placeholder
            </p>
          </GlowCard>
        </section>
      </main>

      <footer className="border-t border-[hsl(var(--color-border-strong))] px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 text-sm text-[hsl(var(--color-text-secondary))] sm:grid-cols-2 lg:grid-cols-4">
          <div>Product</div>
          <div>Resources</div>
          <div>Community</div>
          <div className="relative">
            Legal
            <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[hsl(var(--color-accent)/0.5)] to-transparent" />
          </div>
        </div>
      </footer>
    </AuroraBackground>
  );
}
