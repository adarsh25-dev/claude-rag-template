"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Play, X } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const OVERLINE = "FROM RAW DATA TO PRODUCT";
const HEADING = "Your docs are sleeping data. Wake them up.";
const BODY_LINES = [
  "Upload, configure, and deploy.",
  "In 60 seconds, your documentation becomes an intelligent agent with zero dev work.",
];

/** Set when assets exist (e.g. `/videos/docs-scroll.mp4`). */
const DOCUMENT_VIDEO_SRC = "";
const APP_VIDEO_SRC = "";
/** Lightbox demo; falls back to `APP_VIDEO_SRC`. */
const DEMO_LIGHTBOX_SRC = "";

/**
 * @param {object} props
 * @param {string} [props.src]
 * @param {string} [props.className]
 * @param {boolean} [props.paused]
 */
function StageVideo({ src, className = "", paused }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !paused) {
            void el.play().catch(() => {});
          } else {
            el.pause();
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src, paused]);

  if (!src) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-[hsl(var(--color-bg-elevated))] text-center text-xs text-[hsl(var(--color-text-tertiary))] ${className}`}
      >
        Video placeholder
      </div>
    );
  }

  return (
    <video
      ref={ref}
      className={`h-full w-full object-cover ${className}`}
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
    />
  );
}

export function TransformationSection() {
  const sectionRef = useRef(null);
  const leftRef = useRef(null);
  const stageRef = useRef(null);
  const docMaskRef = useRef(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const headingWords = useMemo(() => HEADING.split(" "), []);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, closeLightbox]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const left = leftRef.current;
      const stage = stageRef.current;
      const docMask = docMaskRef.current;
      if (!section || !left || !stage || !docMask) return undefined;

      const lines = left.querySelectorAll(".transform-line");
      const headInners = left.querySelectorAll(".transform-head-inner");

      const radiusMax = () => {
        const w = stage.clientWidth || 1;
        const h = stage.clientHeight || 1;
        return Math.hypot(w, h) * 0.55;
      };

      const applyClip = (rPx) => {
        docMask.style.clipPath = `circle(${Math.max(0, rPx)}px at 50% 50%)`;
      };

      if (reduceMotion) {
        applyClip(0);
        gsap.set([lines, headInners], { y: 0, opacity: 1 });
        return undefined;
      }

      let rMax = radiusMax();
      applyClip(rMax);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 72%",
          end: "+=130%",
          scrub: 1,
          invalidateOnRefresh: true,
          onRefresh: (self) => {
            rMax = radiusMax();
            applyClip(gsap.utils.interpolate(rMax, 0, self.progress));
          },
          onUpdate: (self) => {
            applyClip(gsap.utils.interpolate(rMax, 0, self.progress));
          },
        },
      });

      tl.fromTo(
        headInners,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.06,
          ease: "power2.out",
          duration: 0.45,
        },
        0,
      );

      tl.fromTo(
        lines,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          ease: "power2.out",
          duration: 0.5,
        },
        0.08,
      );

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    },
    { scope: sectionRef, dependencies: [reduceMotion] },
  );

  const demoSrc = DEMO_LIGHTBOX_SRC || APP_VIDEO_SRC;

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[80vh] scroll-mt-8"
      aria-labelledby="transformation-heading"
    >
      <div className="flex min-h-[80vh] w-full flex-col md:flex-row">
        <div
          ref={leftRef}
          className="flex w-full flex-col justify-center px-6 py-14 md:w-1/2 md:px-10 lg:pl-16 lg:pr-12"
        >
          <p className="transform-line font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[hsl(var(--color-text-tertiary))]">
            {OVERLINE}
          </p>

          <h2
            id="transformation-heading"
            className="mt-4 max-w-xl font-display text-3xl leading-[1.15] tracking-tight text-[hsl(var(--color-text-primary))] sm:text-4xl md:text-[2.65rem]"
          >
            {headingWords.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className="mr-[0.28em] inline-block overflow-hidden last:mr-0"
              >
                <span className="transform-head-inner inline-block will-change-transform">
                  {word}
                </span>
              </span>
            ))}
          </h2>

          <div className="mt-6 max-w-md space-y-3">
            {BODY_LINES.map((line) => (
              <p
                key={line}
                className="transform-line text-base leading-relaxed text-[hsl(var(--color-text-secondary))]"
              >
                {line}
              </p>
            ))}
          </div>

          <div className="transform-line mt-8">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))] px-5 py-2.5 text-sm font-medium text-[hsl(var(--color-text-primary))] transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[hsl(var(--color-accent)/0.35)] hover:bg-[hsl(var(--color-bg-hover))] hover:text-[hsl(var(--color-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--color-accent))]"
            >
              <Play className="size-4" aria-hidden />
              See the Magic
            </button>
          </div>
        </div>

        <div
          ref={stageRef}
          className="relative min-h-[42vh] w-full md:min-h-[80vh] md:w-1/2"
        >
          <div className="sticky top-0 h-[42vh] w-full md:h-screen md:min-h-[80vh]">
            <div className="absolute inset-0 m-4 overflow-hidden rounded-2xl border border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg-elevated))] md:m-6">
              {/* Back: app (revealed as top mask shrinks) */}
              <div className="absolute inset-0 z-0">
                <StageVideo src={APP_VIDEO_SRC} paused={reduceMotion} />
              </div>

              {/* Front: document stack, full circle clip → 0 to dissolve */}
              <div
                ref={docMaskRef}
                className="absolute inset-0 z-[1] will-change-[clip-path]"
              >
                <div className="absolute inset-0 bg-[hsl(var(--color-bg)/0.22)] sepia grayscale contrast-[1.04]">
                  <StageVideo src={DOCUMENT_VIDEO_SRC} paused={reduceMotion} />
                </div>
              </div>

              <p className="pointer-events-none absolute bottom-4 left-4 z-[2] max-w-[11rem] text-[10px] uppercase tracking-wider text-[hsl(var(--color-text-tertiary))]">
                Scroll to dissolve
              </p>
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Demo video"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg))] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-3 top-3 z-[2] rounded-lg border border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg-overlay))] p-2 text-[hsl(var(--color-text-primary))] transition-colors hover:bg-[hsl(var(--color-bg-hover))]"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            {demoSrc ? (
              <video
                className="aspect-video w-full bg-black object-contain"
                src={demoSrc}
                controls
                playsInline
                autoPlay
              />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-[hsl(var(--color-bg-elevated))] p-8 text-center text-sm text-[hsl(var(--color-text-secondary))]">
                <p>Add a demo clip:</p>
                <code className="rounded bg-[hsl(var(--color-bg-overlay))] px-2 py-1 font-mono text-xs">
                  DEMO_LIGHTBOX_SRC
                </code>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
