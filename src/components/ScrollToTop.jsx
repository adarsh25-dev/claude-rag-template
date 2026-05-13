"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLenis } from "@/lib/lenis";

const R = 18;
const CIRC = 2 * Math.PI * R;
const SHOW_AFTER = 500;

/**
 * Fixed control: appears after `SHOW_AFTER` px scroll; ring shows page scroll progress.
 */
export function ScrollToTop() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);

  const tick = useCallback(() => {
    const lenis = getLenis();
    const y = lenis.scroll;
    const p = lenis.progress;
    setOpen(y > SHOW_AFTER);
    setProgress(p);
  }, []);

  useEffect(() => {
    const lenis = getLenis();
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    const unsub = lenis.on("scroll", onScroll);
    tick();
    return () => {
      cancelAnimationFrame(rafRef.current);
      unsub();
    };
  }, [tick]);

  const goTop = useCallback(() => {
    getLenis().scrollTo(0, { duration: 1.1 });
  }, []);

  const dashOffset = CIRC * (1 - progress);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[60] flex transition-opacity duration-300 motion-reduce:transition-none md:bottom-8 md:right-8 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={goTop}
        className="flex size-14 items-center justify-center rounded-full border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.85] text-[hsl(var(--color-text-primary))] shadow-lg backdrop-blur-md transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.04] hover:shadow-[0_0_24px_hsl(var(--color-accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--color-accent))] motion-reduce:hover:scale-100"
        aria-label="Scroll to top"
      >
        <svg
          className="absolute size-14 -rotate-90"
          viewBox="0 0 44 44"
          aria-hidden
        >
          <circle
            cx="22"
            cy="22"
            r={R}
            fill="none"
            stroke="hsl(var(--color-border-strong))"
            strokeWidth="2.5"
          />
          <circle
            cx="22"
            cy="22"
            r={R}
            fill="none"
            stroke="hsl(var(--color-accent))"
            strokeWidth="2.5"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="relative z-[1] text-lg leading-none" aria-hidden>
          ↑
        </span>
      </button>
    </div>
  );
}
