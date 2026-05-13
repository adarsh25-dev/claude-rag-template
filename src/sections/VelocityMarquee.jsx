"use client";

import { useCallback, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { getLenis } from "@/lib/lenis";
import { getSmoothScrollLenis } from "@/src/hooks/useSmoothScroll.js";

const TOP_ITEMS = [
  "PDF",
  "DOCX",
  "Markdown",
  "Notion",
  "Confluence",
  "GitHub",
  "Web",
  "TXT",
  "CSV",
];

const BOTTOM_ITEMS = [
  "OpenAI",
  "Anthropic",
  "Gemini",
  "Pinecone",
  "Supabase",
  "Vercel",
  "LangChain",
];

/**
 * @param {object} props
 * @param {string[]} props.items
 * @param {import("react").MutableRefObject<number>} props.velocityBoostRef
 * @param {import("react").MutableRefObject<number>} props.hoverFactorRef
 * @param {import("react").MutableRefObject<import("gsap").core.Tween | null>} props.tweenRef
 * @param {import("react").MutableRefObject<HTMLDivElement | null>} props.trackRef
 */
function MarqueeRow({ items, velocityBoostRef, hoverFactorRef, tweenRef, trackRef }) {
  const hoverDepthRef = useRef(0);

  const onBadgeEnter = useCallback(() => {
    hoverDepthRef.current += 1;
    hoverFactorRef.current = 0.88;
    const t = tweenRef.current;
    if (!t) return;
    t.timeScale(velocityBoostRef.current * hoverFactorRef.current);
  }, [hoverFactorRef, tweenRef, velocityBoostRef]);

  const onBadgeLeave = useCallback(() => {
    hoverDepthRef.current = Math.max(0, hoverDepthRef.current - 1);
    if (hoverDepthRef.current > 0) return;
    hoverFactorRef.current = 1;
    const t = tweenRef.current;
    if (!t) return;
    t.timeScale(velocityBoostRef.current);
  }, [hoverFactorRef, tweenRef, velocityBoostRef]);

  const doubled = items.concat(items);

  return (
    <div className="relative w-full overflow-hidden">
      <div ref={trackRef} className="flex w-max will-change-transform">
        <div className="flex w-max shrink-0 items-center gap-4 pr-4 md:gap-6 md:pr-6">
          {doubled.map((label, index) => (
            <button
              key={`${label}-${index}`}
              type="button"
              onMouseEnter={onBadgeEnter}
              onMouseLeave={onBadgeLeave}
              className="group/item relative shrink-0 rounded-full p-px transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              <span
                className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(var(--color-accent))] to-[hsl(var(--color-accent)/0.38)] opacity-0 transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/item:opacity-100 motion-reduce:opacity-0"
                aria-hidden
              />
              <span className="relative block rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-[hsl(var(--color-text-primary))] transition-[border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/item:border-transparent">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VelocityMarquee() {
  const sectionRef = useRef(null);
  const topTrackRef = useRef(null);
  const bottomTrackRef = useRef(null);
  const topTweenRef = useRef(null);
  const bottomTweenRef = useRef(null);
  const velocityBoostRef = useRef(1);
  const topHoverFactorRef = useRef(1);
  const bottomHoverFactorRef = useRef(1);
  const lenisUnsubRef = useRef(null);

  useGSAP(
    () => {
      const topTrack = topTrackRef.current;
      const bottomTrack = bottomTrackRef.current;
      if (!topTrack || !bottomTrack) return;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const baseDuration = reduceMotion ? 80 : 28;

      // Duplicated pill strip is 2× wide; animating xPercent by -50% equals one full cycle
      // (same seamless loop as animating to xPercent: -100 on a 2×-wide track).
      const topTween = gsap.fromTo(
        topTrack,
        { xPercent: 0 },
        {
          xPercent: -50,
          duration: baseDuration,
          ease: "none",
          repeat: -1,
        },
      );

      const bottomTween = gsap.fromTo(
        bottomTrack,
        { xPercent: -50 },
        {
          xPercent: 0,
          duration: baseDuration,
          ease: "none",
          repeat: -1,
        },
      );

      topTweenRef.current = topTween;
      bottomTweenRef.current = bottomTween;

      if (reduceMotion) {
        topTween.timeScale(0.35);
        bottomTween.timeScale(0.35);
        return () => {
          topTween.kill();
          bottomTween.kill();
          topTweenRef.current = null;
          bottomTweenRef.current = null;
        };
      }

      const lenis = getSmoothScrollLenis() ?? getLenis();

      const onScroll = (l) => {
        const v = l.velocity;
        const boost = 1 + Math.min(Math.abs(v) * 0.1, 3.5);
        velocityBoostRef.current = boost;

        const skew = Math.max(-8, Math.min(8, v * 0.1));
        gsap.set(topTrack, { skewX: skew });
        gsap.set(bottomTrack, { skewX: skew * 0.85 });

        topTween.timeScale(boost * topHoverFactorRef.current);
        bottomTween.timeScale(boost * bottomHoverFactorRef.current);
      };

      lenisUnsubRef.current = lenis.on("scroll", onScroll);

      return () => {
        if (lenisUnsubRef.current) {
          lenisUnsubRef.current();
          lenisUnsubRef.current = null;
        }
        topTween.kill();
        bottomTween.kill();
        topTweenRef.current = null;
        bottomTweenRef.current = null;
        gsap.set([topTrack, bottomTrack], { clearProps: "skewX" });
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="relative left-1/2 w-screen max-w-none -translate-x-1/2 overflow-hidden bg-[hsl(var(--color-bg))] py-8"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[hsl(var(--color-bg))] to-transparent md:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[hsl(var(--color-bg))] to-transparent md:w-32" />

      <div className="flex flex-col">
        <MarqueeRow
          items={TOP_ITEMS}
          velocityBoostRef={velocityBoostRef}
          hoverFactorRef={topHoverFactorRef}
          tweenRef={topTweenRef}
          trackRef={topTrackRef}
        />
        <div className="py-12" aria-hidden />
        <MarqueeRow
          items={BOTTOM_ITEMS}
          velocityBoostRef={velocityBoostRef}
          hoverFactorRef={bottomHoverFactorRef}
          tweenRef={bottomTweenRef}
          trackRef={bottomTrackRef}
        />
      </div>
    </section>
  );
}

export default VelocityMarquee;
