"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import {
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Activity,
  Brain,
  FileText,
  Globe,
  MessageSquare,
  Workflow,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const HEADING = "Stop writing boilerplate. Start shipping RAG.";

/** Placeholder path — drop a file in `public/` and set this (e.g. `/videos/demo.mp4`). */
const FEATURE_DEMO_VIDEO_SRC = "";

const CARDS = [
  {
    id: "pipeline",
    title: "Visual Pipeline Builder",
    description: "Drag-and-drop interface video.",
    large: true,
    video: true,
    icon: Workflow,
  },
  {
    id: "formats",
    title: "Any Doc, Any Format",
    description: "PDF, DOCX, TXT, Markdown — ingest without friction.",
    formats: ["PDF", "DOCX", "TXT", "MD"],
  },
  {
    id: "chunk",
    title: "Auto-Chunking",
    description: "AI that splits text semantically.",
    icon: Brain,
  },
  {
    id: "deploy",
    title: "One-Click Deploy",
    description: "Ship a hosted URL in minutes.",
    icon: Globe,
  },
  {
    id: "chat-ui",
    title: "Chat UI Generator",
    description: "Preview the generated frontend before you ship.",
    icon: MessageSquare,
  },
  {
    id: "observability",
    title: "Observability",
    description: "Logs and metrics preview for every query.",
    icon: Activity,
  },
];

const GRID_PLACE = [
  "md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-1",
  "md:col-span-1 md:col-start-3 md:row-start-1",
  "md:col-span-1 md:col-start-3 md:row-start-2",
  "md:col-span-1 md:col-start-1 md:row-start-3",
  "md:col-span-1 md:col-start-2 md:row-start-3",
  "md:col-span-1 md:col-start-3 md:row-start-3",
];

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {boolean} [props.reduceMotion]
 */
function FeatureTiltCard({ children, className = "", reduceMotion }) {
  const rootRef = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 320, damping: 28, mass: 0.6 });
  const springY = useSpring(rotateY, { stiffness: 320, damping: 28, mass: 0.6 });

  const [spot, setSpot] = useState({ x: 50, y: 50 });

  const onMove = useCallback(
    (e) => {
      if (reduceMotion) return;
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      rotateY.set(px * 20);
      rotateX.set(-py * 20);
      setSpot({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    [reduceMotion, rotateX, rotateY],
  );

  const onLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    setSpot({ x: 50, y: 50 });
  }, [rotateX, rotateY]);

  const specularStyle = useMemo(
    () => ({
      backgroundImage: `radial-gradient(520px circle at ${spot.x}% ${spot.y}%, hsl(var(--color-accent) / 0.14), transparent 58%)`,
    }),
    [spot.x, spot.y],
  );

  return (
    <div
      ref={rootRef}
      className={`group relative rounded-2xl p-px [perspective:1000px] ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div
          className="absolute left-1/2 top-1/2 h-[220%] w-[220%] will-change-transform"
          style={{
            background:
              "conic-gradient(from 200deg at 50% 50%, hsl(var(--color-accent) / 0.92), hsl(var(--color-accent-2) / 0.55), transparent 52%, hsl(var(--color-accent) / 0.32))",
            animation: reduceMotion
              ? undefined
              : "features-border-spin 7s linear infinite",
          }}
          aria-hidden
        />
      </div>

      <motion.div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-[hsl(var(--color-bg-elevated)/0.42)] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:border-[hsl(var(--color-accent)/0.35)] group-hover:shadow-[0_0_0_1px_hsl(var(--color-accent)/0.12),inset_0_1px_0_0_rgb(255_255_255/0.06)]"
        style={{
          rotateX: springX,
          rotateY: springY,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={specularStyle}
          aria-hidden
        />
        <div className="relative z-[1]">{children}</div>
      </motion.div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.src
 */
function FeatureVideo({ src }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [src]);

  if (!src) {
    return (
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[hsl(var(--color-bg)/0.55)] text-center text-sm text-[hsl(var(--color-text-secondary))]">
        Add a clip at <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-[hsl(var(--color-text-primary))]">FEATURE_DEMO_VIDEO_SRC</code>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      className="aspect-video w-full rounded-xl object-cover opacity-95 mix-blend-overlay"
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
    />
  );
}

export function FeaturesSection() {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const words = useMemo(() => HEADING.split(" "), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const heading = headingRef.current;
      if (!section) return;

      const inners = heading?.querySelectorAll(".feature-head-inner");
      const cards = section.querySelectorAll(".feature-bento-card");

      if (inners?.length) {
        gsap.fromTo(
          inners,
          { yPercent: 120, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            stagger: 0.045,
            duration: 0.65,
            ease: "power3.out",
            scrollTrigger: {
              trigger: heading,
              start: "top 86%",
              once: true,
            },
          },
        );
      }

      if (cards.length) {
        gsap.fromTo(
          cards,
          { y: 100, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 82%",
              once: true,
            },
          },
        );
      }
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative px-6 py-24"
      aria-labelledby="features-heading"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes features-border-spin {
              from { transform: translate(-50%, -50%) rotate(0deg); }
              to { transform: translate(-50%, -50%) rotate(360deg); }
            }
          `,
        }}
      />
      <div className="mx-auto max-w-6xl">
        <h2
          id="features-heading"
          ref={headingRef}
          className="max-w-4xl font-display text-3xl leading-tight tracking-tight text-[hsl(var(--color-text-primary))] sm:text-4xl md:text-5xl"
        >
          {words.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="feature-head-word mr-[0.25em] inline-block overflow-hidden pb-1 last:mr-0"
            >
              <span className="feature-head-inner inline-block will-change-transform">
                {word}
              </span>
            </span>
          ))}
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 md:[grid-auto-rows:minmax(160px,auto)]">
          {CARDS.map((card, index) => {
            const Icon = card.icon;
            const place = GRID_PLACE[index] ?? "";

            return (
              <FeatureTiltCard
                key={card.id}
                reduceMotion={reduceMotion}
                className={`feature-bento-card ${place}`}
              >
                <div
                  className={`flex h-full flex-col p-5 sm:p-6 ${card.large ? "min-h-[280px] md:min-h-0" : ""}`}
                >
                  {card.video && card.large ? (
                    <>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[hsl(var(--color-accent)/0.9)]">
                          {Icon ? (
                            <Icon className="size-5" strokeWidth={1.5} />
                          ) : null}
                        </span>
                        <div>
                          <h3 className="font-display text-lg text-[hsl(var(--color-text-primary))] md:text-xl">
                            {card.title}
                          </h3>
                          <p className="mt-0.5 text-sm text-[hsl(var(--color-text-secondary))]">
                            {card.description}
                          </p>
                        </div>
                      </div>
                      <div className="relative mt-auto flex-1 overflow-hidden rounded-xl">
                        <FeatureVideo src={FEATURE_DEMO_VIDEO_SRC} />
                      </div>
                    </>
                  ) : (
                    <>
                      {card.formats ? (
                        <>
                          <h3 className="font-display text-lg text-[hsl(var(--color-text-primary))]">
                            {card.title}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--color-text-secondary))]">
                            {card.description}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {card.formats.map((ext) => (
                              <span
                                key={ext}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-[hsl(var(--color-accent)/0.88)]"
                              >
                                <FileText className="size-3 opacity-80" />
                                {ext}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mb-3 flex items-start gap-3">
                            {Icon ? (
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[hsl(var(--color-accent)/0.9)]">
                                <Icon className="size-5" strokeWidth={1.5} />
                              </span>
                            ) : null}
                          </div>
                          <h3 className="font-display text-lg text-[hsl(var(--color-text-primary))]">
                            {card.title}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--color-text-secondary))]">
                            {card.description}
                          </p>
                        </>
                      )}
                      {!card.formats && card.id === "chat-ui" ? (
                        <div className="mt-4 rounded-lg border border-white/10 bg-[hsl(var(--color-bg)/0.45)] p-3 font-mono text-[10px] leading-relaxed text-[hsl(var(--color-text-tertiary))]">
                          <span className="text-[hsl(var(--color-accent)/0.85)]">&gt;</span> rag-chat
                          — streaming…
                        </div>
                      ) : null}
                      {!card.formats && card.id === "observability" ? (
                        <div className="mt-4 space-y-1.5 rounded-lg border border-white/10 bg-[hsl(var(--color-bg)/0.45)] p-3 text-[10px] text-[hsl(var(--color-text-secondary))]">
                          <div className="flex justify-between">
                            <span>latency p95</span>
                            <span className="text-[hsl(var(--color-accent)/0.9)]">420ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span>tokens / min</span>
                            <span className="text-[hsl(var(--color-accent)/0.9)]">12.4k</span>
                          </div>
                          <div className="h-8 rounded bg-gradient-to-t from-[hsl(var(--color-accent)/0.18)] to-transparent" />
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </FeatureTiltCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
